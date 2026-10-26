import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 });
    }

    const cleanSessionId = String(sessionId).slice(0, 100);
    const now = new Date().toISOString();

    // 1. Intentar actualizar en tabla dedicada
    const { error: tableError } = await supabaseAdmin
      .from("carritos_abandonados")
      .update({
        estado: "completado",
        updated_at: now,
      })
      .eq("session_id", cleanSessionId);

    if (!tableError) {
      return NextResponse.json({ success: true });
    }

    // 2. Fallback: Actualizar en configuracion.data.carritos_abandonados
    const { data: configRow } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    if (configRow?.data?.carritos_abandonados) {
      const carritos: any[] = configRow.data.carritos_abandonados.map((c: any) =>
        c.session_id === sessionId ? { ...c, estado: "completado", updated_at: now } : c
      );

      await supabaseAdmin
        .from("configuracion")
        .update({
          data: {
            ...configRow.data,
            carritos_abandonados: carritos,
          },
        })
        .eq("id", 1);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error completando carrito:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
