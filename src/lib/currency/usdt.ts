export interface UsdtLiveRate {
  rate: number;
  tasaCompra: number;
  tasaVenta: number;
  fuente: string;
  bcvOfficialRate?: number;
  brechaBcv?: number;
  timestamp: string;
}

// Caché en memoria para optimizar llamadas repetidas y evitar límites de tasa
let cachedLiveRate: { data: UsdtLiveRate; expiresAt: number } | null = null;
const CACHE_DURATION_MS = 60 * 1000; // 1 minuto de caché fresca

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
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const p2pRate = data?.USD?.other?.p2p_usdt?.rate || data?.USD?.rate;
      const bcvRate = data?.USD?.other?.official?.rate;

      if (typeof p2pRate === "number" && p2pRate > 0) {
        const roundedRate = Number(p2pRate.toFixed(2));
        // En Binance P2P, la compra suele estar ligeramente por encima del promedio y la venta ligeramente por debajo
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

        cachedLiveRate = { data: result, expiresAt: now + CACHE_DURATION_MS };
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
      next: { revalidate: 60 },
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

        cachedLiveRate = { data: result, expiresAt: now + CACHE_DURATION_MS };
        return result;
      }
    }
  } catch (err) {
    console.warn("Fallo al consultar DolarApi Venezuela:", err);
  }

  // Fallback seguro si no hay internet
  return {
    rate: 935.0,
    tasaCompra: 935.0,
    tasaVenta: 925.0,
    fuente: "Tasa Referencial Estática",
    timestamp: new Date().toISOString(),
  };
}
