import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSafeErrorResponse } from "@/lib/security/errors";

export async function GET(request: Request) {
  try {
    // 1. Verificación de sesión de administrador
    const isAuth = await isAdminAuthenticated();
    const authHeader = request.headers.get("authorization");
    const secret = process.env.ADMIN_SESSION_SECRET;

    const isBearerValid =
      secret &&
      authHeader &&
      authHeader.startsWith("Bearer ") &&
      authHeader.slice(7) === secret;

    if (!isAuth && !isBearerValid) {
      return NextResponse.json({ error: "No autorizado para descargar copias de seguridad." }, { status: 401 });
    }

    // 2. Extracción de todas las tablas y datos críticos
    const [
      productosRes,
      variantesRes,
      fotosRes,
      pedidosRes,
      configRes,
      carritosRes,
      grillaRes,
    ] = await Promise.all([
      supabaseAdmin.from("productos").select("*"),
      supabaseAdmin.from("variantes").select("*"),
      supabaseAdmin.from("producto_fotos").select("*"),
      supabaseAdmin.from("pedidos").select("*"),
      supabaseAdmin.from("configuracion").select("*"),
      supabaseAdmin.from("carritos_abandonados").select("*"),
      supabaseAdmin.from("grilla_contenido").select("*"),
    ]);

    const backupData = {
      backupVersion: "1.0",
      generatedAt: new Date().toISOString(),
      storeName: "Sumilisto",
      stats: {
        totalProductos: productosRes.data?.length || 0,
        totalVariantes: variantesRes.data?.length || 0,
        totalFotos: fotosRes.data?.length || 0,
        totalPedidos: pedidosRes.data?.length || 0,
        totalCarritos: carritosRes.data?.length || 0,
      },
      database: {
        productos: productosRes.data || [],
        variantes: variantesRes.data || [],
        producto_fotos: fotosRes.data || [],
        pedidos: pedidosRes.data || [],
        configuracion: configRes.data || [],
        carritos_abandonados: carritosRes.data || [],
        grilla_contenido: grillaRes.data || [],
      },
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const filename = `sumilisto_respaldo_seguridad_${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    return createSafeErrorResponse(err, "No se pudo generar la copia de seguridad.", 500);
  }
}

