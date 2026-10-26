import { NextRequest, NextResponse } from "next/server";
import { updateVariant, deleteVariant } from "@/lib/supabase/queries";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { revalidateTag } from "next/cache";

// PUT /api/variants/[id] — Modificar una variante
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, any> = {};
    if (body.sku !== undefined) updates.sku = body.sku.trim();
    if (body.color !== undefined) updates.color = body.color.trim();
    if (body.presentacion !== undefined) updates.presentacion = body.presentacion;
    if (body.precio_mayor_usd !== undefined) updates.precio_mayor_usd = Number(body.precio_mayor_usd);
    if (body.min_mayor !== undefined) updates.min_mayor = Number(body.min_mayor);
    if (body.precio_gran_mayor_usd !== undefined) updates.precio_gran_mayor_usd = Number(body.precio_gran_mayor_usd);
    if (body.min_gran_mayor !== undefined) updates.min_gran_mayor = Number(body.min_gran_mayor);
    if (body.stock !== undefined) updates.stock = Number(body.stock);
    if (body.activo !== undefined) updates.activo = Boolean(body.activo);

    const updated = await updateVariant(id, updates);
    revalidateTag("products");
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/variants/[id] — Eliminar una variante
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await deleteVariant(id);
    revalidateTag("products");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
