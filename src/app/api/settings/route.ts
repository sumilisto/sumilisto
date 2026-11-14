import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/supabase/queries";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { revalidateTag } from "next/cache";

// GET /api/settings — Obtener configuración
export async function GET() {
  try {
    const settings = await getSettings();
    const isAuth = await isAdminAuthenticated();

    // Si es administrador autenticado, entregar configuración completa
    if (isAuth) {
      return NextResponse.json(settings);
    }

    // Blindaje de privacidad para usuarios públicos: excluir carritos, pedidos, datos contables y cronograma de publicaciones (grilla)
    const {
      carritos_abandonados,
      pedidos,
      accounting_settings,
      grilla_contenido,
      ...publicSettings
    } = settings;

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
