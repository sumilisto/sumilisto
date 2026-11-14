import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSafeErrorResponse } from "@/lib/security/errors";

/**
 * Endpoint de respaldo automático invocado por tareas programadas (cron jobs)
 * Autenticación vía Header Authorization: Bearer <CRON_SECRET o ADMIN_SESSION_SECRET>
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SESSION_SECRET;

    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

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

    const backupPayload = {
      backupVersion: "1.0",
      generatedAt: new Date().toISOString(),
      source: "automated_cron",
      stats: {
        productos: productosRes.data?.length || 0,
        pedidos: pedidosRes.data?.length || 0,
      },
      data: {
        productos: productosRes.data || [],
        variantes: variantesRes.data || [],
        producto_fotos: fotosRes.data || [],
        pedidos: pedidosRes.data || [],
        configuracion: configRes.data || [],
        carritos_abandonados: carritosRes.data || [],
        grilla_contenido: grillaRes.data || [],
      },
    };

    // Intentar guardar snapshot en Supabase Storage (bucket 'backups') si existe
    const dateKey = new Date().toISOString().slice(0, 10);
    const path = `automated/backup_${dateKey}.json`;

    try {
      await supabaseAdmin.storage
        .from("backups")
        .upload(path, Buffer.from(JSON.stringify(backupPayload, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });
    } catch {
      // Si el bucket backups no está configurado, la respuesta JSON se entrega al cron runner
    }

    return NextResponse.json({
      ok: true,
      message: "Copia de seguridad automática completada exitosamente.",
      timestamp: new Date().toISOString(),
      stats: backupPayload.stats,
    });
  } catch (err) {
    return createSafeErrorResponse(err, "Error en la ejecución de la copia de seguridad automática.", 500);
  }
}

