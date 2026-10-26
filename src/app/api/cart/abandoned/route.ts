import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/actions/auth";

export async function GET() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    // 1. Intentar leer de tabla dedicada
    const { data: rows, error: tableError } = await supabaseAdmin
      .from("carritos_abandonados")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!tableError && rows) {
      return NextResponse.json({ carritos: rows });
    }

    // 2. Fallback: leer de configuracion.data.carritos_abandonados
    const { data: configRow } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    const carritos = configRow?.data?.carritos_abandonados || [];
    return NextResponse.json({ carritos });
  } catch (err: any) {
    console.error("Error obteniendo carritos abandonados:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { sessionId, estado } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      estado: estado || "contactado",
      updated_at: now,
    };
    if (estado === "contactado") {
      updatePayload.contactado_at = now;
    }

    // 1. Intentar actualizar tabla dedicada
    const { error: tableError } = await supabaseAdmin
      .from("carritos_abandonados")
      .update(updatePayload)
      .eq("session_id", sessionId);

    if (!tableError) {
      return NextResponse.json({ success: true });
    }

    // 2. Fallback
    const { data: configRow } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    if (configRow?.data?.carritos_abandonados) {
      const carritos = configRow.data.carritos_abandonados.map((c: any) =>
        c.session_id === sessionId ? { ...c, ...updatePayload } : c
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
    console.error("Error actualizando carrito:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
