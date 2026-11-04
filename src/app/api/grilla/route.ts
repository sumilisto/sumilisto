import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { getDefaultGrillaItems } from "@/lib/grilla/defaults";
import { GrillaDia, GrillaItem } from "@/types/grilla";

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

    let items: GrillaItem[] = [];
    if (diaGuardado?.items && diaGuardado.items.length > 0) {
      // Normalizar campos (hora vs horarioSugerido, formatoTipo)
      items = diaGuardado.items.map((i: any) => ({
        ...i,
        hora: i.hora || i.horarioSugerido || "08:00 AM",
        formatoTipo:
          i.formatoTipo ||
          (i.tipo?.toLowerCase().includes("historia") ? "historia" : "publicacion"),
      }));
    } else {
      items = getDefaultGrillaItems(fecha);
    }

    // Calcular estadísticas globales y racha
    const fechas = Object.keys(grillaContenido).sort();
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
      historial: grillaContenido,
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

    // Normalizar items para que siempre tengan hora y formatoTipo
    const cleanItems = items.map((i: any) => ({
      id: i.id,
      canal: i.canal,
      formatoTipo:
        i.formatoTipo ||
        (i.tipo?.toLowerCase().includes("historia") ? "historia" : "publicacion"),
      slotNumber: i.slotNumber,
      tipo: i.tipo,
      hora: i.hora || i.horarioSugerido || "08:00 AM",
      productoId: i.productoId || null,
      productoNombre: i.productoNombre || null,
      productoImagen: i.productoImagen || null,
      productoCategoria: i.productoCategoria || null,
      titulo: i.titulo || "",
      completada: Boolean(i.completada),
      completadaAt: i.completadaAt || null,
      notas: i.notas || "",
    }));

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
        items: cleanItems,
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
