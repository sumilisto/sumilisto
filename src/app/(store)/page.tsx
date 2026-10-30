import React from "react";
import { getProducts, getBcvRate } from "@/lib/api/store";
import { getStoreSettings } from "@/lib/actions/settings";
import { HeroSection } from "@/components/store/HeroSection";
import { FeaturedCarousel } from "@/components/store/FeaturedCarousel";
import { CategoryChips } from "@/components/store/CategoryChips";
import { ProductCatalogGrid } from "@/components/store/ProductCatalogGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [products, bcvRate, settings] = await Promise.all([
    getProducts(),
    getBcvRate(),
    getStoreSettings(),
  ]);

  // 1. Carrusel: Administrado manualmente por el usuario (en orden exacto)
  let featuredProducts = [];
  const configuredIds = settings?.featuredProductIds;

  if (Array.isArray(configuredIds)) {
    // Si el usuario configuró la lista en los ajustes (puede estar vacía para ocultarlo)
    featuredProducts = configuredIds
      .map((idOrSku) =>
        products.find(
          (p) =>
            (p.id && String(p.id) === String(idOrSku)) ||
            p.sku.toLowerCase() === String(idOrSku).toLowerCase()
        )
      )
      .filter((p): p is import("@/types/product").Product => Boolean(p && p.isAvailable));
  } else {
    // Respaldo de compatibilidad: Productos marcados con destacado
    const explicitFeatured = products.filter((p) => p.destacado && p.isAvailable);
    featuredProducts = explicitFeatured;
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-6 pb-12">
      {/* Hero Banner / Propuesta de Valor */}
      <HeroSection />

      {/* Barra de Categorías Unificada */}
      <div id="categorias" className="max-w-7xl mx-auto w-full">
        <CategoryChips />
      </div>

      {/* Carrusel: Más Pedidos por Negocios y Comercios · Recomendado para ti (solo si hay seleccionados) */}
      {featuredProducts.length > 0 && (
        <FeaturedCarousel products={featuredProducts} bcvRate={bcvRate} />
      )}

      {/* Catálogo Completo con Selector interactivo */}
      <ProductCatalogGrid products={products} bcvRate={bcvRate} />
    </div>
  );
}
