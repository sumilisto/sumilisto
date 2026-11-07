// Rate limiter en memoria para protección de endpoints públicos contra abusos y DoS
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpieza periódica de registros vencidos para evitar saturación de memoria
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // @ts-ignore
  if (timer.unref) timer.unref();
}

/**
 * Valida si un identificador (IP o sessionId) ha superado el límite de peticiones.
 * @param identifier Identificador único (ej. IP del cliente)
 * @param limit Número máximo de peticiones permitidas en la ventana
 * @param windowMs Ventana de tiempo en milisegundos (por defecto 1 minuto)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 20,
  windowMs: number = 60 * 1000
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  record.count += 1;
  return { ok: true, remaining: limit - record.count };
}

/**
 * Extrae la IP real del cliente detrás de proxies (Vercel, Cloudflare).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

