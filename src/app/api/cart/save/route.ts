import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionId,
      nombre,
      telefono,
      zonaEntrega,
      direccion,
      metodoPago,
      items,
      totalUsd,
    } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 });
    }

    const cartPayload = {
      session_id: String(sessionId).slice(0, 100),
      nombre: String(nombre || "").slice(0, 100),
      telefono: String(telefono || "").slice(0, 50),
      zona_entrega: String(zonaEntrega || "").slice(0, 100),
      direccion: String(direccion || "").slice(0, 255),
      metodo_pago: String(metodoPago || "").slice(0, 50),
      items: Array.isArray(items) ? items.slice(0, 100) : [],
      total_usd: Math.max(0, Math.min(Number(totalUsd) || 0, 1000000)),
      updated_at: new Date().toISOString(),
    };

    // 1. Intentar guardar en la tabla dedicada carritos_abandonados
    const { error: tableError } = await supabaseAdmin
      .from("carritos_abandonados")
      .upsert(
        {
          ...cartPayload,
          estado: "pendiente",
        },
        { onConflict: "session_id" }
      );

    if (!tableError) {
      return NextResponse.json({ success: true, storage: "table" });
    }

    // 2. Fallback resiliente: Guardar en configuracion.data.carritos_abandonados
    const { data: configRow } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    const existingData = configRow?.data || {};
    const carritos: any[] = existingData.carritos_abandonados || [];

    const existingIdx = carritos.findIndex((c) => c.session_id === sessionId);
    if (existingIdx >= 0) {
      // Si ya estaba completado, mantener estado
      const prevStatus = carritos[existingIdx].estado || "pendiente";
      carritos[existingIdx] = {
        ...carritos[existingIdx],
        ...cartPayload,
        estado: prevStatus === "completado" ? "completado" : "pendiente",
      };
    } else {
      carritos.unshift({
        ...cartPayload,
        id: sessionId,
        estado: "pendiente",
        created_at: new Date().toISOString(),
      });
    }

    // Mantener máximo los últimos 150 registros
    const trimmed = carritos.slice(0, 150);

    await supabaseAdmin
      .from("configuracion")
      .update({
        data: {
          ...existingData,
          carritos_abandonados: trimmed,
        },
      })
      .eq("id", 1);

    return NextResponse.json({ success: true, storage: "config_fallback" });
  } catch (err: any) {
    console.error("Error guardando carrito:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
