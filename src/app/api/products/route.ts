import { NextRequest, NextResponse } from "next/server";
import { getAllProductsAdmin, createProduct, createVariant, deleteProduct } from "@/lib/supabase/queries";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { revalidateTag } from "next/cache";
import { createSafeErrorResponse } from "@/lib/security/errors";

// GET /api/products — Lista todos los productos (admin)
export async function GET() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const products = await getAllProductsAdmin();
    return NextResponse.json(products);
  } catch (error: any) {
    return createSafeErrorResponse(error, "No se pudieron obtener los productos.");
  }
}

// POST /api/products — Crear un producto nuevo
export async function POST(request: NextRequest) {
  let createdProductId: string | null = null;
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const body = await request.json();

    const resolvedSku = (body.sku || (Array.isArray(body.variantes) && body.variantes[0]?.sku) || "").trim();
    if (!resolvedSku || !body.nombre?.trim()) {
      return NextResponse.json(
        { error: "Campos obligatorios: sku, nombre" },
        { status: 400 }
      );
    }

    // Validar SKUs duplicados en la lista de variantes enviada
    if (Array.isArray(body.variantes) && body.variantes.length > 0) {
      const variantSkus = body.variantes.map((v: any) => (v.sku || resolvedSku).trim().toUpperCase());
      const duplicateSku = variantSkus.find((sku: string, idx: number) => variantSkus.indexOf(sku) !== idx);
      if (duplicateSku) {
        return NextResponse.json(
          { error: `El código SKU "${duplicateSku}" está repetido en más de una variante. Cada variante debe tener un SKU único diferente.` },
          { status: 400 }
        );
      }
    }

    const slug = body.slug || body.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const product = await createProduct({
      sku: resolvedSku,
      nombre: body.nombre.trim(),
      slug,
      categoria: body.categoria || "Envases",
      descripcion: body.descripcion || body.descripcionLarga || "",
      unidad_venta: body.unidad_venta || body.unidadVenta || body.presentacion || "Unidad",
      activo: body.activo ?? true,
      destacado: body.destacado ?? false,
    });

    createdProductId = product?.id || null;

    if (product && product.id) {
      if (Array.isArray(body.variantes) && body.variantes.length > 0) {
        for (const v of body.variantes) {
          await createVariant({
            producto_id: product.id,
            sku: (v.sku || resolvedSku).trim(),
            color: (v.color || "ESTÁNDAR").trim(),
            presentacion: v.presentacion || body.unidad_venta || body.unidadVenta || "Unidad",
            costo_mayor_usd: v.costo_mayor_usd != null && !isNaN(Number(v.costo_mayor_usd)) ? Number(v.costo_mayor_usd) : null,
            precio_mayor_usd: Number(v.precio_mayor_usd) || 0,
            min_mayor: Number(v.min_mayor) || 1,
            costo_gran_mayor_usd: v.costo_gran_mayor_usd != null && !isNaN(Number(v.costo_gran_mayor_usd)) ? Number(v.costo_gran_mayor_usd) : null,
            precio_gran_mayor_usd: Number(v.precio_gran_mayor_usd) || 0,
            min_gran_mayor: Number(v.min_gran_mayor) || 5,
            stock: Number(v.stock) || 0,
            activo: v.activo ?? true,
          });
        }
      } else {
        await createVariant({
          producto_id: product.id,
          sku: resolvedSku,
          color: (body.color || "ESTÁNDAR").trim(),
          presentacion: body.presentacion || body.unidad_venta || body.unidadVenta || "Unidad",
          costo_mayor_usd: body.costo_mayor_usd != null && !isNaN(Number(body.costo_mayor_usd)) ? Number(body.costo_mayor_usd) : null,
          precio_mayor_usd: Number(body.precio_mayor_usd) || 0,
          min_mayor: Number(body.min_mayor) || 1,
          costo_gran_mayor_usd: body.costo_gran_mayor_usd != null && !isNaN(Number(body.costo_gran_mayor_usd)) ? Number(body.costo_gran_mayor_usd) : null,
          precio_gran_mayor_usd: Number(body.precio_gran_mayor_usd) || 0,
          min_gran_mayor: Number(body.min_gran_mayor) || 5,
          stock: Number(body.stock) || 0,
          activo: body.activo ?? true,
        });
      }
    }

    revalidateTag("products");
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (createdProductId) {
      // Rollback: limpiar el producto huérfano si falló la creación de variantes para evitar bloqueos de sku_key
      await deleteProduct(createdProductId).catch(() => {});
    }
    const errMsg = String(error?.message || "");
    if (errMsg.includes("variantes_sku_key") || errMsg.includes("duplicate key")) {
      return NextResponse.json(
        { error: "Uno de los códigos SKU ya está registrado en la base de datos o repetido. Cada variante debe tener un SKU único." },
        { status: 400 }
      );
    }
    if (errMsg.includes("productos_sku_key")) {
      return NextResponse.json(
        { error: "Ya existe un producto registrado con ese código SKU principal." },
        { status: 400 }
      );
    }
    return createSafeErrorResponse(error, "No se pudo crear el producto.");
  }
}
