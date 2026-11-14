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

  // Interceptar rutas del panel administrativo (/admin)
  if (pathname.startsWith("/admin")) {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    if (isRateLimited(ip, 80, 60000)) {
      return new NextResponse("Demasiadas peticiones al panel. Acceso bloqueado temporalmente.", {
        status: 429,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60" },
      });
    }

    const response = NextResponse.next();

    // Impedir estrictamente el almacenamiento en caché de vistas y bundles del panel administrativo
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

