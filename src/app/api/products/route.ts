import { NextRequest, NextResponse } from "next/server";
import { getAllProductsAdmin, createProduct, createVariant } from "@/lib/supabase/queries";
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

    if (!body.sku || !body.nombre) {
      return NextResponse.json(
        { error: "Campos obligatorios: sku, nombre" },
        { status: 400 }
      );
    }

    const slug = body.slug || body.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const product = await createProduct({
      sku: body.sku.trim(),
      nombre: body.nombre.trim(),
      slug,
      categoria: body.categoria || "Envases",
      descripcion: body.descripcion || "",
      unidad_venta: body.unidad_venta || body.presentacion || "100 Unidades",
      activo: body.activo ?? true,
      destacado: body.destacado ?? false,
    });

    if (product && product.id) {
      await createVariant({
        producto_id: product.id,
        sku: body.sku.trim(),
        color: body.color || "ESTÁNDAR",
        presentacion: body.presentacion || body.unidad_venta || "Unidad",
        precio_mayor_usd: Number(body.precio_mayor_usd) || 0,
        min_mayor: Number(body.min_mayor) || 1,
        precio_gran_mayor_usd: Number(body.precio_gran_mayor_usd) || 0,
        min_gran_mayor: Number(body.min_gran_mayor) || 5,
        stock: Number(body.stock) || 0,
        activo: body.activo ?? true,
      });
    }

    revalidateTag("products");
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
