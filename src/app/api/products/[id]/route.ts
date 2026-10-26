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
import { isAdminAuthenticated } from "@/lib/actions/auth";
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
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Separar variantes del producto base
    const { variantes, ...productData } = body;

    // Normalizar campos en productData si vienen con camelCase
    const cleanProductData: Record<string, any> = {};
    if (productData.nombre !== undefined) cleanProductData.nombre = productData.nombre;
    if (productData.categoria !== undefined) cleanProductData.categoria = productData.categoria;
    if (productData.descripcion !== undefined) cleanProductData.descripcion = productData.descripcion;
    if (productData.descripcionLarga !== undefined && cleanProductData.descripcion === undefined) {
      cleanProductData.descripcion = productData.descripcionLarga;
    }
    if (productData.unidad_venta !== undefined) cleanProductData.unidad_venta = productData.unidad_venta;
    if (productData.unidadVenta !== undefined && cleanProductData.unidad_venta === undefined) {
      cleanProductData.unidad_venta = productData.unidadVenta;
    }
    if (productData.activo !== undefined) cleanProductData.activo = productData.activo;
    if (productData.destacado !== undefined) cleanProductData.destacado = productData.destacado;

    // Actualizar producto base
    const updated = await updateProduct(id, cleanProductData);

    // Actualizar variantes si vienen en el body
    if (variantes && Array.isArray(variantes)) {
      for (const v of variantes) {
        if (v.id) {
          await updateVariant(v.id, {
            sku: v.sku?.trim(),
            color: v.color?.trim(),
            presentacion: v.presentacion,
            precio_mayor_usd: Number(v.precio_mayor_usd),
            min_mayor: Number(v.min_mayor),
            precio_gran_mayor_usd: Number(v.precio_gran_mayor_usd),
            min_gran_mayor: Number(v.min_gran_mayor),
            stock: Number(v.stock),
            activo: v.activo,
          });
        } else {
          // Nueva variante
          await createVariant({
            producto_id: id,
            sku: v.sku?.trim() || `${cleanProductData.nombre || "VAR"}-${Date.now()}`,
            color: v.color?.trim() || "Estándar",
            presentacion: v.presentacion || cleanProductData.unidad_venta || "Unidad",
            precio_mayor_usd: Number(v.precio_mayor_usd) || 0,
            min_mayor: Number(v.min_mayor) || 1,
            precio_gran_mayor_usd: Number(v.precio_gran_mayor_usd) || 0,
            min_gran_mayor: Number(v.min_gran_mayor) || 5,
            stock: Number(v.stock) || 0,
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
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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
