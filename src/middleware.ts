import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting simple en memoria en el borde para mitigar escaneos agresivos en /admin
const adminScans = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = adminScans.get(ip);
  if (!entry || entry.resetAt <= now) {
    adminScans.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) {
    return true;
  }
  entry.count += 1;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");

  // 1. FORZAR HTTPS EN TODAS LAS PÁGINAS (Producción)
  if (process.env.NODE_ENV === "production" && proto === "http" && host) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  // 2. PANEL ADMINISTRATIVO (/admin) - Headers y limitación de tasa estrictos
  if (pathname.startsWith("/admin")) {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    if (isRateLimited(ip, 60, 60000)) {
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

  // 3. CABECERAS DE SEGURIDAD GLOBALES (Para toda la tienda pública)
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
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
