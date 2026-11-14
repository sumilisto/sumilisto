// Rate limiter para checkout y formularios públicos
const formSubmissions = new Map<string, { count: number; resetAt: number }>();

const HONEYPOT_FIELDS = [
  "hp_company_website",
  "hp_security_check",
  "website_url",
  "bot_check",
  "business_fax",
];

/**
 * Detecta si una petición proviene de un bot automatizado inspeccionando campos trampa (honeypot)
 * y el tiempo mínimo de interacción humana.
 */
export function isBotSubmission(body: Record<string, any>): boolean {
  if (!body || typeof body !== "object") return false;

  // 1. Verificación de Honeypot: si algún campo trampa tiene valor, es un bot
  for (const field of HONEYPOT_FIELDS) {
    if (body[field] && String(body[field]).trim().length > 0) {
      return true;
    }
  }

  // 2. Verificación de tiempo de llenado (si se envió _form_loaded_at)
  if (body._form_loaded_at) {
    const loadedAt = Number(body._form_loaded_at);
    if (Number.isFinite(loadedAt)) {
      const duration = Date.now() - loadedAt;
      // Menos de 800ms para llenar un pedido o carrito es físicamente imposible para un humano
      if (duration < 800) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Limita la cantidad de pedidos o envíos de formulario por dirección IP
 */
export function isSubmissionRateLimited(
  ip: string,
  limit = 10,
  windowMs = 10 * 60 * 1000 // 10 minutos
): boolean {
  const now = Date.now();
  const entry = formSubmissions.get(ip);

  if (!entry || entry.resetAt <= now) {
    formSubmissions.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count += 1;
  return false;
}

