import https from "https";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface BcvStatusDetails {
  rate: number;
  isOfficialOnline: boolean;
  fechaValor: string | null;
  lastSyncAt: string;
  notice?: string;
  error?: string | null;
}

export const DEFAULT_BCV_RATE = 880.12;

/**
 * Consulta EXCLUSIVAMENTE el portal oficial del Banco Central de Venezuela:
 * https://www.bcv.org.ve/
 * NO utiliza ningún intermediario, API de terceros ni página alterna.
 */
export function fetchBcvOfficialDirect(): Promise<{
  rate: number | null;
  fechaValor: string | null;
  error?: string;
}> {
  return new Promise((resolve) => {
    // Se utiliza un agente https con soporte para certificados del estado venezolano
    const agent = new https.Agent({ rejectUnauthorized: false });
    const req = https.get(
      "https://www.bcv.org.ve/",
      {
        agent,
        timeout: 8000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Cache-Control": "no-cache",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          // 1. Extraer tasa oficial del contenedor USD
          const rateMatch = data.match(/id=["']dolar["'][\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i);
          let rate: number | null = null;
          if (rateMatch && rateMatch[1]) {
            const cleaned = rateMatch[1].trim().replace(/\./g, "").replace(",", ".");
            const num = parseFloat(cleaned);
            if (!isNaN(num) && num > 0) {
              rate = Number(num.toFixed(4));
            }
          }

          // 2. Extraer Fecha Valor oficial indicada por el BCV
          const dateMatch =
            data.match(/Fecha Valor:[\s\S]*?<span[^>]*class=["'][^"']*date-display-single[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
            data.match(/Fecha Valor:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
          let fechaValor: string | null = null;
          if (dateMatch && dateMatch[1]) {
            fechaValor = dateMatch[1].trim().replace(/\s+/g, " ");
          }

          if (rate) {
            return resolve({ rate, fechaValor });
          } else {
            return resolve({ rate: null, fechaValor: null, error: "Estructura de tasa no encontrada en bcv.org.ve" });
          }
        });
      }
    );

    req.on("error", (err) => {
      resolve({ rate: null, fechaValor: null, error: `Error de conexión: ${err.message}` });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ rate: null, fechaValor: null, error: "Tiempo de espera agotado al conectar con bcv.org.ve (Timeout)" });
    });
  });
}

/**
 * Resuelve la tasa activa:
 * 1. Intenta consultar https://www.bcv.org.ve/
 * 2. Si bcv.org.ve responde: actualiza la base de datos con la nueva tasa y fecha valor.
 * 3. Si bcv.org.ve está caído o no responde: toma la ÚLTIMA actualización generada en la base de datos y genera una notificación.
 */
export async function getResolvedBcvDetails(): Promise<BcvStatusDetails> {
  const directResult = await fetchBcvOfficialDirect();

  // Caso 1: La página oficial respondió con éxito
  if (directResult.rate && directResult.rate > 0) {
    const nowIso = new Date().toISOString();
    
    // Guardar en Supabase para que quede como la última actualización registrada
    await saveBcvToSupabase(directResult.rate, directResult.fechaValor, true, null);

    return {
      rate: directResult.rate,
      isOfficialOnline: true,
      fechaValor: directResult.fechaValor,
      lastSyncAt: nowIso,
    };
  }

  // Caso 2: La página oficial de bcv.org.ve está caída o falló
  console.warn(`[ALERTA BCV] El portal oficial https://www.bcv.org.ve/ no respondió (${directResult.error || "error desconocido"}). Se usará la última actualización guardada.`);

  // Leer la última actualización generada en la base de datos
  const lastKnown = await getLastStoredBcvFromSupabase();

  // Notificar en la base de datos que la página está caída
  saveBcvStatusOnly(false, directResult.error || "Portal bcv.org.ve no disponible").catch(() => {});

  return {
    rate: lastKnown.rate,
    isOfficialOnline: false,
    fechaValor: lastKnown.fechaValor,
    lastSyncAt: lastKnown.lastSyncAt,
    error: directResult.error || "El portal bcv.org.ve no respondió",
    notice: `⚠️ El portal oficial https://www.bcv.org.ve/ no respondió. Se está utilizando la última actualización generada (${lastKnown.fechaValor || lastKnown.lastSyncAt}).`,
  };
}

/**
 * Devuelve solo el valor numérico para llamadas de la tienda
 */
export async function getResolvedBcvRate(): Promise<number> {
  const details = await getResolvedBcvDetails();
  return details.rate;
}

/**
 * Obtiene la última tasa y metadatos registrados en Supabase
 */
async function getLastStoredBcvFromSupabase(): Promise<{
  rate: number;
  fechaValor: string | null;
  lastSyncAt: string;
}> {
  try {
    const { data } = await supabaseAdmin
      .from("configuracion")
      .select("tasa_bcv, data, updated_at")
      .eq("id", 1)
      .single();

    if (data?.tasa_bcv && Number(data.tasa_bcv) > 0) {
      const bcvMeta = data.data?.bcv_meta || {};
      return {
        rate: Number(data.tasa_bcv),
        fechaValor: bcvMeta.fecha_valor || null,
        lastSyncAt: bcvMeta.last_sync || data.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error("Error leyendo último registro de Supabase:", err);
  }

  return {
    rate: DEFAULT_BCV_RATE,
    fechaValor: null,
    lastSyncAt: new Date().toISOString(),
  };
}

/**
 * Guarda la tasa y metadatos en Supabase
 */
export async function saveBcvToSupabase(
  rate: number,
  fechaValor: string | null,
  isOnline: boolean,
  errorMsg: string | null
): Promise<boolean> {
  try {
    const { data: current } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    const existingData = current?.data || {};
    const updatedData = {
      ...existingData,
      bcv_meta: {
        last_sync: new Date().toISOString(),
        fecha_valor: fechaValor || existingData?.bcv_meta?.fecha_valor || null,
        is_official_online: isOnline,
        last_error: errorMsg,
      },
    };

    const { error } = await supabaseAdmin
      .from("configuracion")
      .update({
        tasa_bcv: rate,
        data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return !error;
  } catch (err) {
    console.error("Error guardando tasa en Supabase:", err);
    return false;
  }
}

/**
 * Actualiza únicamente el estado de conectividad en Supabase sin alterar la tasa
 */
async function saveBcvStatusOnly(isOnline: boolean, errorMsg: string): Promise<void> {
  try {
    const { data: current } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    if (current) {
      const existingData = current.data || {};
      const updatedData = {
        ...existingData,
        bcv_meta: {
          ...(existingData.bcv_meta || {}),
          is_official_online: isOnline,
          last_error: errorMsg,
          last_failed_attempt: new Date().toISOString(),
        },
      };

      await supabaseAdmin
        .from("configuracion")
        .update({ data: updatedData })
        .eq("id", 1);
    }
  } catch {}
}
