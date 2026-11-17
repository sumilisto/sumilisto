import { supabaseAdmin } from "@/lib/supabase/admin";
import { UsdtRates, DEFAULT_USDT_RATES } from "@/types/accounting";

export interface UsdtLiveRate {
  rate: number;
  tasaCompra: number;
  tasaVenta: number;
  fuente: string;
  bcvOfficialRate?: number;
  brechaBcv?: number;
  timestamp: string;
}

// Caché en memoria para optimizar llamadas repetidas (5 minutos)
let cachedLiveRate: { data: UsdtLiveRate; expiresAt: number } | null = null;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Consulta la tasa de cambio de USDT en Venezuela en tiempo real
 * Fuentes:
 * 1. Yadio P2P API (Monitorea órdenes de Binance P2P USDT/VES directamente)
 * 2. DolarApi Venezuela (Mercado Cripto/Paralelo en tiempo real)
 */
export async function getLiveUsdtRate(): Promise<UsdtLiveRate> {
  const now = Date.now();
  if (cachedLiveRate && cachedLiveRate.expiresAt > now) {
    return cachedLiveRate.data;
  }

  // 1. Intentar Yadio API (P2P USDT Binance en Venezuela)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://api.yadio.io/json/VES", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "SumilistoApp/1.0",
      },
      next: { revalidate: 300 }, // 5 minutos
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const p2pRate = data?.USD?.other?.p2p_usdt?.rate || data?.USD?.rate;
      const bcvRate = data?.USD?.other?.official?.rate;

      if (typeof p2pRate === "number" && p2pRate > 0) {
        const roundedRate = Number(p2pRate.toFixed(2));
        // En Binance P2P la compra suele estar ligeramente por encima del promedio y la venta ligeramente por debajo
        const tasaCompra = Number((roundedRate * 1.002).toFixed(2));
        const tasaVenta = Number((roundedRate * 0.998).toFixed(2));
        const brecha = bcvRate && bcvRate > 0 ? Number((((roundedRate - bcvRate) / bcvRate) * 100).toFixed(2)) : undefined;

        const result: UsdtLiveRate = {
          rate: roundedRate,
          tasaCompra,
          tasaVenta,
          fuente: "Binance P2P (VES/USDT)",
          bcvOfficialRate: bcvRate ? Number(bcvRate.toFixed(2)) : undefined,
          brechaBcv: brecha,
          timestamp: new Date().toISOString(),
        };

        cachedLiveRate = { data: result, expiresAt: now + FIVE_MINUTES_MS };
        return result;
      }
    }
  } catch (err) {
    console.warn("Fallo al consultar Yadio P2P, intentando fuente alterna:", err);
  }

  // 2. Fuente alterna: DolarApi Venezuela
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://ve.dolarapi.com/v1/dolares/paralelo", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "SumilistoApp/1.0",
      },
      next: { revalidate: 300 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const promedio = data?.promedio;

      if (typeof promedio === "number" && promedio > 0) {
        const roundedRate = Number(promedio.toFixed(2));
        const tasaCompra = Number((roundedRate * 1.002).toFixed(2));
        const tasaVenta = Number((roundedRate * 0.998).toFixed(2));

        const result: UsdtLiveRate = {
          rate: roundedRate,
          tasaCompra,
          tasaVenta,
          fuente: "Mercado Paralelo/Cripto VE",
          timestamp: new Date().toISOString(),
        };

        cachedLiveRate = { data: result, expiresAt: now + FIVE_MINUTES_MS };
        return result;
      }
    }
  } catch (err) {
    console.warn("Fallo al consultar DolarApi Venezuela:", err);
  }

  // Fallback seguro si no hay internet
  return {
    rate: 1069.0,
    tasaCompra: 1070.0,
    tasaVenta: 1065.0,
    fuente: "Tasa Referencial Estática",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Resuelve y actualiza automáticamente la tasa USDT cada 5 minutos en segundo plano
 * - Si pasaron 5 minutos desde la última sincronización, consulta Binance P2P automáticamente
 * - Persiste la nueva tasa en la base de datos Supabase
 * - No requiere sincronización manual por parte del usuario
 */
export async function getResolvedUsdtRates(): Promise<UsdtRates> {
  try {
    // Si no hay Supabase configurado (ej: entorno de pruebas unitarias), resolver en vivo directamente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      const live = await getLiveUsdtRate();
      return {
        tasaCompraUsdt: live.tasaCompra,
        tasaVentaUsdt: live.tasaVenta,
        ultimaActualizacion: live.timestamp,
      };
    }

    const { data: configData } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    const currentRates: UsdtRates = configData?.data?.tasas_usdt || DEFAULT_USDT_RATES;
    const lastUpdate = currentRates.ultimaActualizacion ? new Date(currentRates.ultimaActualizacion).getTime() : 0;
    const now = Date.now();

    // Si fue actualizada hace menos de 5 minutos (300,000 ms), devolver la tasa actual
    if (now - lastUpdate < FIVE_MINUTES_MS && currentRates.tasaCompraUsdt > 0) {
      return currentRates;
    }

    // Pasaron 5 minutos o no tiene timestamp: actualizar automáticamente en segundo plano
    const live = await getLiveUsdtRate();
    if (live && live.rate > 0) {
      const updatedRates: UsdtRates = {
        tasaCompraUsdt: live.tasaCompra,
        tasaVentaUsdt: live.tasaVenta,
        ultimaActualizacion: new Date().toISOString(),
      };

      const existingData = configData?.data || {};
      await supabaseAdmin
        .from("configuracion")
        .update({
          data: {
            ...existingData,
            tasas_usdt: updatedRates,
          },
        })
        .eq("id", 1);

      return updatedRates;
    }

    return currentRates;
  } catch (err) {
    console.error("Error en getResolvedUsdtRates:", err);
    return DEFAULT_USDT_RATES;
  }
}
