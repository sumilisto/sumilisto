"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/types/product";
import { ProductCard } from "@/components/store/ProductCard";
import { Sparkles, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

interface FeaturedCarouselProps {
  products: Product[];
  bcvRate?: number;
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  products,
  bcvRate = 880.12,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [products]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = Math.max(260, scrollRef.current.clientWidth * 0.75);
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto py-1 sm:py-2">
      {/* Cabecera compacta con márgenes reducidos */}
      <div className="px-4 sm:px-6 mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-brand uppercase tracking-wider mb-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-brand flex-shrink-0" />
            <span>Más Pedidos por Restaurantes</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Recomendado para ti
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{products.length} productos</span>
            </span>
          </div>
        </div>

        {/* Botones de navegación del carrusel */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Anterior"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 flex items-center justify-center transition-all ${
              canScrollLeft
                ? "bg-white hover:bg-slate-50 text-slate-700 shadow-xs active:scale-95 cursor-pointer"
                : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
            }`}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Siguiente"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 flex items-center justify-center transition-all ${
              canScrollRight
                ? "bg-white hover:bg-slate-50 text-slate-700 shadow-xs active:scale-95 cursor-pointer"
                : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
            }`}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Carrusel Deslizable Horizontalmente */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto scrollbar-none [scroll-snap-type:x_mandatory] flex gap-3 sm:gap-4.5 px-4 sm:px-6 py-1 scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {products.map((product) => (
          <div
            key={product.sku}
            className="w-[160px] sm:w-[220px] md:w-[240px] flex-shrink-0 [scroll-snap-align:start] flex flex-col"
          >
            <ProductCard product={product} bcvRate={bcvRate} />
          </div>
        ))}
      </div>
    </section>
  );
};
