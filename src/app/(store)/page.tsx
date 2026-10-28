import React from "react";
import { getProducts, getBcvRate } from "@/lib/api/store";
import { HeroSection } from "@/components/store/HeroSection";
import { FeaturedCarousel } from "@/components/store/FeaturedCarousel";
import { CategoryChips } from "@/components/store/CategoryChips";
import { ProductCatalogGrid } from "@/components/store/ProductCatalogGrid";

export default async function HomePage() {
  const [products, bcvRate] = await Promise.all([getProducts(), getBcvRate()]);

  // 1. Carrusel: Destacados desde el admin (hasta 15 productos)
  const explicitFeatured = products.filter((p) => p.destacado && p.isAvailable);
  const otherAvailable = products.filter((p) => !p.destacado && p.isAvailable);
  const featuredProducts = [...explicitFeatured, ...otherAvailable].slice(0, 15);

  return (
    <div className="flex flex-col gap-3 sm:gap-6 pb-12">
      {/* Hero Banner / Propuesta de Valor */}
      <HeroSection />

      {/* Barra de Categorías Unificada */}
      <div id="categorias" className="max-w-7xl mx-auto w-full">
        <CategoryChips />
      </div>

      {/* Carrusel: Más Pedidos por Negocios y Comercios · Recomendado para ti (hasta 15 productos) */}
      <FeaturedCarousel products={featuredProducts} bcvRate={bcvRate} />

      {/* Catálogo Completo con Orden inicial en Destacados / Más pedidos y Selector interactivo */}
      <ProductCatalogGrid products={products} bcvRate={bcvRate} />
    </div>
  );
}
