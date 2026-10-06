import React from "react";
import Link from "next/link";
import { MOCK_PRODUCTS } from "@/lib/mock/products";
import { STORE_CATEGORIES } from "@/lib/constants/brand";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryChips } from "@/components/store/CategoryChips";
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Truck, Percent } from "lucide-react";

export default function HomePage() {
  const bcvRate = 42.50; // Tasa referencial para modo MOCK

  // Filtrar productos destacados y con descuento a gran mayor
  const featuredProducts = MOCK_PRODUCTS.filter((p) => p.destacado && p.isAvailable);
  const granMayorDeals = MOCK_PRODUCTS.filter(
    (p) => p.isAvailable && p.precioGranMayorUsd && p.precioGranMayorUsd > 0
  ).slice(0, 4);

  return (
    <div className="flex flex-col gap-6 sm:gap-10 pb-12">
      {/* Hero Banner / Propuesta de Valor */}
      <section className="bg-gradient-to-br from-[#590317] via-[#73041e] to-[#400210] text-white py-8 sm:py-14 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold text-rose-100 mb-4">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Precios Directos de Distribución Mayorista</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white max-w-3xl leading-tight">
            Suministros y Empaques al Mayor para tu Restaurante
          </h1>

          <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-rose-100 max-w-2xl leading-relaxed">
            Envases térmicos, bolsas kraft, cubiertos y papel antigrasa con escala de descuento al <strong>Gran Mayor</strong>. Despachos rápidos en <strong>Caracas, Guarenas y Guatire</strong>.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="#catalogo"
              className="h-12 px-6 rounded-xl bg-white text-[#590317] hover:bg-rose-50 font-bold text-sm sm:text-base flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <span>Explorar Catálogo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://wa.me/584227894547?text=Hola%20Sumilisto,%20deseo%20asesoría%20sobre%20suministros%20para%20mi%20negocio"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-6 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <span>Consultar por WhatsApp</span>
            </a>
          </div>

          {/* Ventajas rápidas */}
          <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl text-xs sm:text-sm text-rose-200">
            <div className="flex items-center justify-center gap-2">
              <Truck className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Despacho Caracas / Guarenas / Guatire</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Percent className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Escala Gran Mayor por volumen</span>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Pago verificado contra entrega / retiro</span>
            </div>
          </div>
        </div>
      </section>

      {/* Selector de Categorías (Chips horizontales) */}
      <section id="categorias" className="max-w-7xl mx-auto w-full">
        <div className="px-4 sm:px-6 mb-2 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Líneas de Suministros
          </h2>
          <span className="text-xs text-slate-500">4 categorías principales</span>
        </div>
        <CategoryChips />
      </section>

      {/* Sección 1: Más Pedidos (Destacados) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#590317]" />
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Más Pedidos por Restaurantes
            </h2>
          </div>
          <Link
            href="/categoria/envases"
            className="text-xs sm:text-sm font-bold text-[#590317] hover:underline flex items-center gap-1"
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

      {/* Sección 2: Ofertas al Gran Mayor */}
      <section className="bg-amber-50/60 py-8 px-4 sm:px-6 border-y border-amber-200/60">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900">
                  Ahorro por volumen
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  Escala Gran Mayor
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Precios especiales llevando a partir de 4 a 10 bultos o cajas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {granMayorDeals.map((product) => (
              <ProductCard key={product.sku} product={product} bcvRate={bcvRate} />
            ))}
          </div>
        </div>
      </section>

      {/* Sección 3: Todo el Catálogo Organizado */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            Catálogo Completo de Productos ({MOCK_PRODUCTS.length})
          </h2>
          <span className="text-xs text-slate-500">Stock para entrega inmediata</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {MOCK_PRODUCTS.map((product) => (
            <ProductCard key={product.sku} product={product} bcvRate={bcvRate} />
          ))}
        </div>
      </section>
    </div>
  );
}
