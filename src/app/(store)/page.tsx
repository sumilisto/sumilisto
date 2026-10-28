import React from "react";
import { getProducts, getBcvRate } from "@/lib/api/store";
import { ProductCard } from "@/components/store/ProductCard";
import { HeroSection } from "@/components/store/HeroSection";
import { FeaturedCarousel } from "@/components/store/FeaturedCarousel";

export default async function HomePage() {
  const [products, bcvRate] = await Promise.all([getProducts(), getBcvRate()]);

  // 1. Carrusel: Destacados desde el admin (hasta 15 productos)
  // Se priorizan los marcados como "destacado = true", completando con los disponibles
  const explicitFeatured = products.filter((p) => p.destacado && p.isAvailable);
  const otherAvailable = products.filter((p) => !p.destacado && p.isAvailable);
  const featuredProducts = [...explicitFeatured, ...otherAvailable].slice(0, 15);

  // 2. Catálogo Completo: Orden Alfabético (A - Z)
  const alphabeticalProducts = [...products].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }
    return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  });

  return (
    <div className="flex flex-col gap-3 sm:gap-6 pb-12">
      {/* Hero Banner / Propuesta de Valor */}
      <HeroSection />

      <div id="categorias" />

      {/* Carrusel: Más Pedidos por Negocios y Comercios · Recomendado para ti (hasta 15 productos) */}
      <FeaturedCarousel products={featuredProducts} bcvRate={bcvRate} />

      {/* Catálogo Completo (Ordenado Alfabéticamente de la A a la Z) */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-1 sm:mt-2">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Catálogo Completo de Productos ({alphabeticalProducts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Orden alfabético (A-Z)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {alphabeticalProducts.map((product) => (
            <ProductCard key={product.sku} product={product} bcvRate={bcvRate} />
          ))}
        </div>
      </section>
    </div>
  );
}
