import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveLocation } from "@/lib/analytics/geo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      ruta,
      productoSku,
      productoNombre,
      productoId,
      referrer,
      sessionId,
      dispositivo,
      navegador,
    } = body;

    if (!ruta || !sessionId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Ignorar accesos a páginas de administración
    if (ruta.startsWith("/admin") || ruta.startsWith("/api")) {
      return NextResponse.json({ skipped: true });
    }

    // Ignorar si la visita proviene de un administrador o dispositivo excluido
    const adminCookie = req.cookies.get("sumilisto_admin_session");
    if (adminCookie?.value || body.isExcluded || body.isAdmin) {
      return NextResponse.json({ skipped: true, reason: "admin_excluded" });
    }

    // Obtener IP del visitante
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

    // Geolocalización desde cabeceras de Vercel / Cloudflare
    const rawCountry = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "VE";
    const rawRegion = req.headers.get("x-vercel-ip-country-region") || req.headers.get("cf-region");
    const rawCityHeader = req.headers.get("x-vercel-ip-city") || req.headers.get("cf-ipcity");

    const { pais, estado, ciudad } = resolveLocation(rawCountry, rawRegion, rawCityHeader);

    // Dispositivo y Navegador (detectar si no vino en el body)
    const userAgent = req.headers.get("user-agent") || "";
    let deviceResolved = dispositivo;
    if (!deviceResolved) {
      if (/mobile|iphone|android|ipad/i.test(userAgent)) {
        deviceResolved = /ipad|tablet/i.test(userAgent) ? "Tablet" : "Móvil";
      } else {
        deviceResolved = "Escritorio";
      }
    }

    let browserResolved = navegador;
    if (!browserResolved) {
      if (/edg/i.test(userAgent)) browserResolved = "Edge";
      else if (/chrome|crios/i.test(userAgent)) browserResolved = "Chrome";
      else if (/safari/i.test(userAgent)) browserResolved = "Safari";
      else if (/firefox|fxios/i.test(userAgent)) browserResolved = "Firefox";
      else browserResolved = "Otro";
    }

    // Insertar visita en analitica_visitas
    const { error: insertError } = await supabaseAdmin.from("analitica_visitas").insert({
      session_id: String(sessionId).slice(0, 80),
      ip: ip.length > 45 ? ip.substring(0, 45) : ip,
      pais: String(pais).slice(0, 50),
      estado: String(estado).slice(0, 60),
      ciudad: String(ciudad).slice(0, 60),
      dispositivo: String(deviceResolved).slice(0, 20),
      navegador: String(browserResolved).slice(0, 30),
      ruta: String(ruta).slice(0, 255),
      producto_id: productoId ? String(productoId).slice(0, 50) : null,
      producto_sku: productoSku ? String(productoSku).slice(0, 80) : null,
      producto_nombre: productoNombre ? String(productoNombre).slice(0, 150) : null,
      referrer: referrer ? String(referrer).substring(0, 255) : null,
    });

    if (insertError) {
      console.error("Error al registrar visita:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Excepción en track route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
