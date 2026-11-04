import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { getDefaultGrillaItems } from "@/lib/grilla/defaults";
import { GrillaDia } from "@/types/grilla";

// GET /api/grilla?fecha=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get("fecha");
    const today = new Date().toISOString().split("T")[0];
    const fecha = fechaParam || today;

    // Obtener grilla guardada en configuracion.data.grilla_contenido
    const { data: configRow, error } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    if (error) {
      console.warn("No se pudo leer configuracion:", error.message);
    }

    const grillaContenido = configRow?.data?.grilla_contenido || {};
    const diaGuardado: GrillaDia | undefined = grillaContenido[fecha];

    const items = diaGuardado?.items && diaGuardado.items.length > 0
      ? diaGuardado.items
      : getDefaultGrillaItems(fecha);

    // Calcular estadísticas globales de cumplimiento
    const fechas = Object.keys(grillaContenido);
    let totalCompletadasGlobal = 0;
    let diasConActividad = 0;

    for (const f of fechas) {
      const d = grillaContenido[f];
      if (d?.items && Array.isArray(d.items)) {
        const completadas = d.items.filter((i: any) => i.completada).length;
        if (completadas > 0) {
          diasConActividad += 1;
          totalCompletadasGlobal += completadas;
        }
      }
    }

    return NextResponse.json({
      fecha,
      items,
      notasGenerales: diaGuardado?.notasGenerales || "",
      isDefault: !diaGuardado,
      updatedAt: diaGuardado?.updatedAt,
      stats: {
        totalCompletadasGlobal,
        diasConActividad,
      },
    });
  } catch (err: any) {
    console.error("Error obteniendo grilla:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/grilla — Guardar o actualizar la grilla del día
export async function POST(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { fecha, items, notasGenerales } = body;

    if (!fecha || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "fecha e items son requeridos" },
        { status: 400 }
      );
    }

    // 1. Obtener data actual para no sobreescribir otros datos de configuración
    const { data: configRow } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    const existingData = configRow?.data || {};
    const existingGrilla = existingData.grilla_contenido || {};

    const updatedGrilla = {
      ...existingGrilla,
      [fecha]: {
        fecha,
        items,
        notasGenerales: notasGenerales || "",
        updatedAt: new Date().toISOString(),
      },
    };

    const mergedData = {
      ...existingData,
      grilla_contenido: updatedGrilla,
    };

    const { error: updateError } = await supabaseAdmin
      .from("configuracion")
      .update({
        data: mergedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      fecha,
      message: "Grilla guardada exitosamente",
    });
  } catch (err: any) {
    console.error("Error guardando grilla:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
