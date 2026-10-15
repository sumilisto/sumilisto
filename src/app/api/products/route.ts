import { NextRequest, NextResponse } from "next/server";
import { getAllProductsAdmin, createProduct } from "@/lib/supabase/queries";
import { revalidateTag } from "next/cache";

// GET /api/products — Lista todos los productos (admin)
export async function GET() {
  try {
    const products = await getAllProductsAdmin();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/products — Crear un producto nuevo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.sku || !body.nombre || !body.slug) {
      return NextResponse.json(
        { error: "Campos obligatorios: sku, nombre, slug" },
        { status: 400 }
      );
    }

    const product = await createProduct({
      sku: body.sku,
      nombre: body.nombre,
      slug: body.slug,
      categoria: body.categoria || "General",
      descripcion: body.descripcion || "",
      unidad_venta: body.unidad_venta || "100 Unidades",
      activo: body.activo ?? true,
      destacado: body.destacado ?? false,
    });

    revalidateTag("products");
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
