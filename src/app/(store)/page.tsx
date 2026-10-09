import React from "react";
import Link from "next/link";
import { getProducts, getBcvRate } from "@/lib/api/store";
import { STORE_CATEGORIES } from "@/lib/constants/brand";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryChips } from "@/components/store/CategoryChips";
import { HeroSection } from "@/components/store/HeroSection";
import { TrendingUp, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const [products, bcvRate] = await Promise.all([getProducts(), getBcvRate()]);

  const featuredProducts = products.filter((p) => p.isAvailable).slice(0, 4);

  return (
    <div className="flex flex-col gap-6 sm:gap-10 pb-12">
      {/* Hero Banner / Propuesta de Valor (dinámico desde Settings) */}
      <HeroSection />

      {/* Selector de Categorías */}
      <section id="categorias" className="max-w-7xl mx-auto w-full">
        <div className="px-4 sm:px-6 mb-2 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Líneas de Suministros
          </h2>
          <span className="text-xs text-slate-500">4 categorías principales</span>
        </div>
        <CategoryChips />
      </section>

      {/* Sección: Más Pedidos (Destacados) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand" />
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Más Pedidos por Restaurantes
            </h2>
          </div>
          <Link
            href="/categoria/envases"
            className="text-xs sm:text-sm font-bold text-brand hover:underline flex items-center gap-1"
          >
            <span>Ver más</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {featuredProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.sku} product={product} bcvRate={bcvRate} />
          ))}
        </div>
      </section>

      {/* Catálogo Completo */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            Catálogo Completo de Productos ({products.length})
          </h2>
          <span className="text-xs text-slate-500">Stock para entrega inmediata</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product.sku} product={product} bcvRate={bcvRate} />
          ))}
        </div>
      </section>
    </div>
  );
}
