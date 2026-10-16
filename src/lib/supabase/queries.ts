import { supabaseAdmin } from "@/lib/supabase/admin";
import { Product, ProductVariant, ProductPhoto } from "@/types/product";

// ─────────────────────────────────────────────────────────
// OBTENER TODOS LOS PRODUCTOS (con variantes y fotos)
// ─────────────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  const { data: productos, error } = await supabaseAdmin
    .from("productos")
    .select(`
      *,
      variantes (*),
      producto_fotos (*)
    `)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo productos:", error);
    return [];
  }

  return (productos || []).map(mapDbToProduct);
}

// ─────────────────────────────────────────────────────────
// OBTENER UN PRODUCTO POR SLUG
// ─────────────────────────────────────────────────────────
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .select(`
      *,
      variantes (*),
      producto_fotos (*)
    `)
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return mapDbToProduct(data);
}

// ─────────────────────────────────────────────────────────
// OBTENER TASA BCV
// ─────────────────────────────────────────────────────────
export async function getBcvRate(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("configuracion")
    .select("tasa_bcv")
    .eq("id", 1)
    .single();

  if (error || !data) return 880.12;
  return Number(data.tasa_bcv) || 880.12;
}

// ─────────────────────────────────────────────────────────
// OBTENER CONFIGURACIÓN / TEMA
// ─────────────────────────────────────────────────────────
export async function getSettings(): Promise<Record<string, any>> {
  const { data, error } = await supabaseAdmin
    .from("configuracion")
    .select("data, tasa_bcv")
    .eq("id", 1)
    .single();

  if (error || !data) return {};
  return { ...data.data, tasaBcv: Number(data.tasa_bcv) || 880.12 };
}

// ─────────────────────────────────────────────────────────
// GUARDAR CONFIGURACIÓN / TEMA
// ─────────────────────────────────────────────────────────
export async function updateSettings(settings: Record<string, any>): Promise<boolean> {
  const { tasaBcv, ...themeData } = settings;

  const updatePayload: Record<string, any> = { data: themeData };
  if (tasaBcv !== undefined) {
    updatePayload.tasa_bcv = Number(tasaBcv);
  }

  const { error } = await supabaseAdmin
    .from("configuracion")
    .update(updatePayload)
    .eq("id", 1);

  if (error) {
    console.error("Error guardando configuración:", error);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────
// CRUD DE PRODUCTOS
// ─────────────────────────────────────────────────────────

export async function createProduct(product: {
  sku: string;
  nombre: string;
  slug: string;
  categoria: string;
  descripcion?: string;
  unidad_venta?: string;
  activo?: boolean;
  destacado?: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .insert(product)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProduct(id: string, updates: Record<string, any>) {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabaseAdmin
    .from("productos")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return true;
}

// ─────────────────────────────────────────────────────────
// CRUD DE VARIANTES
// ─────────────────────────────────────────────────────────

export async function createVariant(variant: {
  producto_id: string;
  sku: string;
  color?: string;
  presentacion?: string;
  precio_mayor_usd?: number;
  min_mayor?: number;
  precio_gran_mayor_usd?: number;
  min_gran_mayor?: number;
  stock?: number;
  activo?: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("variantes")
    .insert(variant)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateVariant(id: string, updates: Record<string, any>) {
  const { data, error } = await supabaseAdmin
    .from("variantes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVariant(id: string) {
  const { error } = await supabaseAdmin
    .from("variantes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return true;
}

// ─────────────────────────────────────────────────────────
// FOTOS: SUBIR Y ELIMINAR
// ─────────────────────────────────────────────────────────

export async function uploadProductPhoto(
  productoId: string,
  file: File | Buffer,
  fileName: string,
  options?: { alt?: string; orden?: number; isPrimary?: boolean }
) {
  // 1. Subir archivo a Storage
  const filePath = `${productoId}/${Date.now()}-${fileName}`;
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("productos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  // 2. Obtener URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from("productos")
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // 3. Registrar en la tabla producto_fotos
  const { data: fotoData, error: fotoError } = await supabaseAdmin
    .from("producto_fotos")
    .insert({
      producto_id: productoId,
      url: publicUrl,
      alt: options?.alt || fileName,
      orden: options?.orden || 0,
      is_primary: options?.isPrimary || false,
    })
    .select()
    .single();

  if (fotoError) throw new Error(fotoError.message);
  return fotoData;
}

export async function deleteProductPhoto(fotoId: string, storageUrl: string) {
  // 1. Extraer path del storage desde la URL
  const bucketBase = `/storage/v1/object/public/productos/`;
  const pathIndex = storageUrl.indexOf(bucketBase);
  if (pathIndex >= 0) {
    const filePath = storageUrl.slice(pathIndex + bucketBase.length);
    await supabaseAdmin.storage.from("productos").remove([filePath]);
  }

  // 2. Eliminar registro de la tabla
  const { error } = await supabaseAdmin
    .from("producto_fotos")
    .delete()
    .eq("id", fotoId);

  if (error) throw new Error(error.message);
  return true;
}

// ─────────────────────────────────────────────────────────
// OBTENER TODOS LOS PRODUCTOS (admin, incluye inactivos)
// ─────────────────────────────────────────────────────────
export async function getAllProductsAdmin() {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .select(`
      *,
      variantes (*),
      producto_fotos (*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo productos admin:", error);
    return [];
  }

  return (data || []).map(mapDbToProduct);
}

// ─────────────────────────────────────────────────────────
// MAPPER: DB row → Product (tipo frontend)
// ─────────────────────────────────────────────────────────
function mapDbToProduct(row: any): Product {
  const variantes: ProductVariant[] = (row.variantes || []).map((v: any) => ({
    sku: v.sku,
    color: v.color || "ESTÁNDAR",
    presentacion: v.presentacion || v.color || "Unidad",
    precioMayorUsd: v.precio_mayor_usd ? Number(v.precio_mayor_usd) : undefined,
    minMayor: v.min_mayor || 100,
    precioGranMayorUsd: v.precio_gran_mayor_usd ? Number(v.precio_gran_mayor_usd) : undefined,
    minGranMayor: v.min_gran_mayor || 500,
    stock: v.stock || 0,
    status: v.activo && v.stock > 0 ? "disponible" : "agotado",
    isAvailable: v.activo && v.stock > 0 && (v.precio_mayor_usd || 0) > 0,
    fotos: [],
  }));

  const fotos: ProductPhoto[] = (row.producto_fotos || [])
    .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
    .map((f: any) => ({
      url: f.url,
      publicId: f.id,
      alt: f.alt || row.nombre,
      isPrimary: f.is_primary || false,
    }));

  // Si no hay fotos, usar placeholder
  if (fotos.length === 0) {
    fotos.push({
      url: "https://placehold.co/600x600/f1f5f9/94a3b8?text=Sin+Foto",
      alt: row.nombre || "Producto",
    });
  }

  const primaryVariant = variantes.find((v) => v.isAvailable) || variantes[0];
  const hasAnyAvailable = variantes.some((v) => v.isAvailable);

  const colorsList = variantes
    .map((v) => v.color)
    .filter((c): c is string => Boolean(c && c !== "ESTÁNDAR"));

  const presentacion =
    colorsList.length > 1
      ? `${colorsList.length} Colores (${colorsList.join(", ")})`
      : primaryVariant?.color || "Unidad";

  const totalStock = variantes.reduce((sum, v) => sum + v.stock, 0);

  return {
    sku: primaryVariant?.sku || row.sku,
    nombre: row.nombre,
    slug: row.slug,
    categoria: row.categoria,
    color: primaryVariant?.color,
    presentacion,
    unidadVenta: row.unidad_venta || "100 Unidades",
    precioMayorUsd: primaryVariant?.precioMayorUsd,
    minMayor: primaryVariant?.minMayor || 100,
    precioGranMayorUsd: primaryVariant?.precioGranMayorUsd,
    minGranMayor: primaryVariant?.minGranMayor,
    stock: totalStock,
    activo: row.activo,
    destacado: row.destacado,
    fotos,
    status: hasAnyAvailable ? "disponible" : "agotado",
    isAvailable: hasAnyAvailable,
    descripcionLarga: row.descripcion,
    variantes,
  };
}
