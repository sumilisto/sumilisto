import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/supabase/queries";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { revalidateTag } from "next/cache";

// GET /api/settings — Obtener configuración
export async function GET() {
  try {
    const settings = await getSettings();
    // Capa extra de protección: excluir carritos y PII de la respuesta pública
    const { carritos_abandonados, ...publicSettings } = settings;
    return NextResponse.json(publicSettings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/settings — Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const ok = await updateSettings(body);

    if (!ok) {
      return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
    }

    revalidateTag("settings");
    revalidateTag("bcv");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
