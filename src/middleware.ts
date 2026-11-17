import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting simple en memoria en el borde para mitigar escaneos agresivos en /admin y scraping
const adminScans = new Map<string, { count: number; resetAt: number }>();
const apiProductScans = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(store: Map<string, { count: number; resetAt: number }>, ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) {
    return true;
  }
  entry.count += 1;
  return false;
}

// User-agents de programas de clonación masiva y scrapers conocidos
const BLOCKED_CLONER_BOTS = [
  /httrack/i,
  /teleport\s*pro/i,
  /webcopier/i,
  /offline\s*explorer/i,
  /siteextractor/i,
  /webzip/i,
  /scrapy/i,
  /libwww-perl/i,
  /pycurl/i,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");
  const userAgent = request.headers.get("user-agent") || "";

  // 1. BLOQUEO DE HERRAMIENTAS DE CLONACIÓN AUTOMATIZADA (HTTrack, Scrapy, etc.)
  if (BLOCKED_CLONER_BOTS.some((botRegex) => botRegex.test(userAgent))) {
    return new NextResponse("Acceso restringido: las herramientas de descarga y clonación automática no están permitidas.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 2. FORZAR HTTPS EN TODAS LAS PÁGINAS (Producción)
  if (process.env.NODE_ENV === "production" && proto === "http" && host) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  // 3. RATE LIMITING EN API PÚBLICA DE PRODUCTOS (Mitigar extracción masiva)
  if (pathname.startsWith("/api/products")) {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    if (isRateLimited(apiProductScans, ip, 100, 60000)) {
      return new NextResponse("Límite de solicitudes excedido.", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  // 4. PANEL ADMINISTRATIVO (/admin) - Headers y limitación de tasa estrictos
  if (pathname.startsWith("/admin")) {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    if (isRateLimited(adminScans, ip, 60, 60000)) {
      return new NextResponse("Demasiadas peticiones al panel administrativo. Acceso bloqueado temporalmente por seguridad.", {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "60",
        },
      });
    }

    const response = NextResponse.next();

    // Impedir estrictamente almacenamiento en caché del panel
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    return response;
  }

  // 5. CABECERAS DE SEGURIDAD GLOBALES (Para toda la tienda pública)
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto archivos estáticos del compilador (_next/static, _next/image, favicon.ico)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
