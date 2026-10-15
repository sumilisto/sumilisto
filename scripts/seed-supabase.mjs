import { createClient } from "@supabase/supabase-js";
import { MOCK_PRODUCTS } from "./src/lib/mock/products";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ahbmxclygadabukxtlrn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoYm14Y2x5Z2FkYWJ1a3h0bHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAwODMwNiwiZXhwIjoyMTA3NTg0MzA2fQ.YIdFkt_huyDq_Wz2P0axbYhQZOA-IVlQ-wXaZGd0Fj4";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function seed() {
  console.log(`Iniciando migración de ${MOCK_PRODUCTS.length} productos a Supabase...`);

  let creados = 0;
  for (const p of MOCK_PRODUCTS) {
    try {
      // 1. Insertar producto
      const { data: prodData, error: prodErr } = await supabase
        .from("productos")
        .insert({
          sku: p.sku,
          nombre: p.nombre,
          slug: p.slug,
          categoria: p.categoria || "General",
          descripcion: p.descripcionLarga || "",
          unidad_venta: p.unidadVenta || p.presentacion || "100 Unidades",
          activo: p.activo ?? true,
          destacado: p.destacado ?? false,
        })
        .select()
        .single();

      if (prodErr) {
        console.error(`Error insertando producto ${p.sku}:`, prodErr.message);
        continue;
      }

      // 2. Insertar variantes
      const variantes = p.variantes && p.variantes.length > 0 ? p.variantes : [
        {
          sku: p.sku,
          color: p.color || "ESTÁNDAR",
          presentacion: p.presentacion || "Unidad",
          precioMayorUsd: p.precioMayorUsd || 0,
          minMayor: p.minMayor || 1,
          precioGranMayorUsd: p.precioGranMayorUsd || 0,
          minGranMayor: p.minGranMayor || 5,
          stock: p.stock || 100,
          isAvailable: p.isAvailable ?? true
        }
      ];

      for (const v of variantes) {
        await supabase.from("variantes").insert({
          producto_id: prodData.id,
          sku: v.sku,
          color: v.color || "ESTÁNDAR",
          presentacion: v.presentacion || "",
          precio_mayor_usd: v.precioMayorUsd || 0,
          min_mayor: v.minMayor || 1,
          precio_gran_mayor_usd: v.precioGranMayorUsd || 0,
          min_gran_mayor: v.minGranMayor || 5,
          stock: v.stock || 0,
          activo: v.isAvailable ?? true
        });
      }

      // 3. Insertar fotos
      if (p.fotos && p.fotos.length > 0) {
        for (let i = 0; i < p.fotos.length; i++) {
          const f = p.fotos[i];
          await supabase.from("producto_fotos").insert({
            producto_id: prodData.id,
            url: f.url,
            alt: f.alt || p.nombre,
            orden: i,
            is_primary: f.isPrimary ?? (i === 0)
          });
        }
      }

      creados++;
      console.log(`[${creados}/${MOCK_PRODUCTS.length}] Migrado: ${p.nombre} (${p.sku})`);
    } catch (e) {
      console.error(`Fallo inesperado con ${p.sku}:`, e);
    }
  }

  console.log(`\n Migración finalizada con éxito: ${creados} productos cargados en Supabase.`);
}

seed();
