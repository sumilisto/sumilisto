import { NextRequest, NextResponse } from "next/server";
import {
  getProductBySlug,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
} from "@/lib/supabase/queries";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

// GET /api/products/[id] — Obtener un producto por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Intentar buscar por ID primero
    const { data, error } = await supabaseAdmin
      .from("productos")
      .select(`*, variantes (*), producto_fotos (*)`)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/products/[id] — Actualizar producto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Separar variantes del producto base
    const { variantes, ...productData } = body;

    // Actualizar producto base
    const updated = await updateProduct(id, productData);

    // Actualizar variantes si vienen en el body
    if (variantes && Array.isArray(variantes)) {
      for (const v of variantes) {
        if (v.id) {
          await updateVariant(v.id, {
            color: v.color,
            presentacion: v.presentacion,
            precio_mayor_usd: v.precio_mayor_usd,
            min_mayor: v.min_mayor,
            precio_gran_mayor_usd: v.precio_gran_mayor_usd,
            min_gran_mayor: v.min_gran_mayor,
            stock: v.stock,
            activo: v.activo,
          });
        } else {
          // Nueva variante
          await createVariant({
            producto_id: id,
            sku: v.sku,
            color: v.color,
            presentacion: v.presentacion,
            precio_mayor_usd: v.precio_mayor_usd,
            min_mayor: v.min_mayor,
            precio_gran_mayor_usd: v.precio_gran_mayor_usd,
            min_gran_mayor: v.min_gran_mayor,
            stock: v.stock,
            activo: v.activo ?? true,
          });
        }
      }
    }

    revalidateTag("products");
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/products/[id] — Eliminar producto (y sus variantes/fotos en cascada)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Obtener fotos para limpiar Storage
    const { data: fotos } = await supabaseAdmin
      .from("producto_fotos")
      .select("url")
      .eq("producto_id", id);

    // Limpiar archivos del Storage
    if (fotos && fotos.length > 0) {
      const paths = fotos
        .map((f) => {
          const base = `/storage/v1/object/public/productos/`;
          const idx = f.url.indexOf(base);
          return idx >= 0 ? f.url.slice(idx + base.length) : null;
        })
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        await supabaseAdmin.storage.from("productos").remove(paths);
      }
    }

    // 1. Eliminar fotos de la base de datos
    await supabaseAdmin.from("producto_fotos").delete().eq("producto_id", id);

    // 2. Eliminar variantes asociadas
    await supabaseAdmin.from("variantes").delete().eq("producto_id", id);

    // 3. Eliminar producto
    await deleteProduct(id);
    revalidateTag("products");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
