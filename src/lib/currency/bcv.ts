import https from "https";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface BcvFetchResult {
  rate: number;
  source: "bcv_direct" | "dolarapi_mirror" | "database" | "fallback";
  timestamp: string;
}

export const DEFAULT_BCV_RATE = 880.12;

/**
 * 1. Raspador directo del portal oficial del Banco Central de Venezuela (https://www.bcv.org.ve/)
 * Utiliza un agente https permisivo con certificados del estado venezolano.
 */
export function fetchBcvDirect(): Promise<number | null> {
  return new Promise((resolve) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const req = https.get(
      "https://www.bcv.org.ve/",
      {
        agent,
        timeout: 6000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          // Busca el bloque <div id="dolar"... y extrae la etiqueta <strong> con el valor
          const match = data.match(/id=["']dolar["'][\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i);
          if (match && match[1]) {
            // El BCV usa formato "880,11590000"
            const cleaned = match[1].trim().replace(/\./g, "").replace(",", ".");
            const num = parseFloat(cleaned);
            if (!isNaN(num) && num > 0) {
              return resolve(Number(num.toFixed(4)));
            }
          }
          resolve(null);
        });
      }
    );

    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * 2. API espejo de alta disponibilidad (ve.dolarapi.com/v1/dolares/oficial)
 * Refleja directamente el valor oficial del BCV minuto a minuto.
 */
export function fetchDolarApiMirror(): Promise<number | null> {
  return new Promise((resolve) => {
    const req = https.get(
      "https://ve.dolarapi.com/v1/dolares/oficial",
      {
        timeout: 5000,
        headers: {
          "User-Agent": "SumilistoStore/1.0",
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json && typeof json.promedio === "number" && json.promedio > 0) {
              return resolve(Number(json.promedio.toFixed(4)));
            }
          } catch {}
          resolve(null);
        });
      }
    );

    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * 3. Obtiene la tasa en vivo y actualiza Supabase en segundo plano si cambió.
 */
export async function getResolvedBcvRate(): Promise<number> {
  let liveRate: number | null = null;

  // Intentar primero BCV directo
  liveRate = await fetchBcvDirect();
  if (!liveRate) {
    // Si falla BCV directo, intentar espejo DolarAPI
    liveRate = await fetchDolarApiMirror();
  }

  // Si obtuvimos una tasa en vivo válida
  if (liveRate && liveRate > 0) {
    // Guardar en Supabase de forma asíncrona para mantener la base de datos sincronizada
    updateSupabaseBcv(liveRate).catch((err) => {
      console.warn("No se pudo persistir tasa BCV en Supabase:", err);
    });
    return liveRate;
  }

  // Si ambas consultas en vivo fallaron (ej. red caída), leer de Supabase
  try {
    const { data } = await supabaseAdmin
      .from("configuracion")
      .select("tasa_bcv")
      .eq("id", 1)
      .single();

    if (data?.tasa_bcv && Number(data.tasa_bcv) > 0) {
      return Number(data.tasa_bcv);
    }
  } catch (err) {
    console.error("Error leyendo tasa BCV desde Supabase:", err);
  }

  return DEFAULT_BCV_RATE;
}

/**
 * Actualiza la tasa BCV en Supabase
 */
export async function updateSupabaseBcv(rate: number): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("configuracion")
      .update({
        tasa_bcv: rate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return !error;
  } catch (err) {
    console.error("Error guardando tasa en Supabase:", err);
    return false;
  }
}
