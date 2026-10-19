import { NextRequest, NextResponse } from "next/server";
import { createVariant } from "@/lib/supabase/queries";
import { revalidateTag } from "next/cache";

// POST /api/variants — Crear una nueva variante de producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.producto_id || !body.sku || !body.color) {
      return NextResponse.json(
        { error: "producto_id, sku y color son obligatorios" },
        { status: 400 }
      );
    }

    const newVariant = await createVariant({
      producto_id: body.producto_id,
      sku: body.sku.trim(),
      color: body.color.trim(),
      presentacion: body.presentacion || body.color || "Unidad",
      precio_mayor_usd: Number(body.precio_mayor_usd) || 0,
      min_mayor: Number(body.min_mayor) || 1,
      precio_gran_mayor_usd: Number(body.precio_gran_mayor_usd) || 0,
      min_gran_mayor: Number(body.min_gran_mayor) || 5,
      stock: Number(body.stock) || 0,
      activo: body.activo ?? true,
    });

    revalidateTag("products");
    return NextResponse.json(newVariant, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
