import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/supabase/queries";
import { revalidateTag } from "next/cache";

// GET /api/settings — Obtener configuración
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/settings — Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
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
