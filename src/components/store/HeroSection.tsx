"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme/ThemeContext";
import { ArrowRight, Sparkles, ShieldCheck, Truck, Percent, ChevronLeft, ChevronRight } from "lucide-react";

export function HeroSection() {
  const { theme } = useTheme();
  const [activeSlide, setActiveSlide] = useState(0);
  const hasSlides = theme.heroSlides && theme.heroSlides.length > 0;

  const heightMap = {
    sm: "py-6 sm:py-10",
    md: "py-8 sm:py-14",
    lg: "py-12 sm:py-20",
    xl: "py-16 sm:py-28",
  };
  const heightClass = heightMap[theme.heroHeight || "md"];

  const whaNum = theme.whatsappNumber || "584227894547";

  return (
    <section
      className={`bg-gradient-to-br from-brand via-brand-hover to-brand-active text-white ${heightClass} px-4 sm:px-6 relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Carousel de imágenes si hay slides */}
      {hasSlides && (
        <div className="absolute inset-0 z-0">
          {theme.heroSlides.map((slide, idx) => {
            const content = (
              <img
                src={slide.imageUrl}
                alt={`Banner ${idx + 1}`}
                className={`w-full h-full object-cover transition-opacity duration-700 ${idx === activeSlide ? "opacity-60" : "opacity-0 absolute inset-0"}`}
              />
            );
            return slide.linkUrl ? (
              <Link key={idx} href={slide.linkUrl} className="absolute inset-0 block">{content}</Link>
            ) : (
              <div key={idx} className="absolute inset-0">{content}</div>
            );
          })}

          {/* Navegación de slides */}
          {theme.heroSlides.length > 1 && (
            <>
              <button
                onClick={() => setActiveSlide(i => Math.max(0, i - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveSlide(i => Math.min(theme.heroSlides.length - 1, i + 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {theme.heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === activeSlide ? "bg-white w-4" : "bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold text-rose-100 mb-4">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Precios Directos de Distribución Mayorista</span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white max-w-3xl leading-tight">
          {theme.heroTitle}
        </h1>

        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-rose-100 max-w-2xl leading-relaxed">
          {theme.heroSubtitle}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="#catalogo"
            className="h-12 px-6 rounded-xl bg-white text-brand hover:bg-rose-50 font-bold text-sm sm:text-base flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <span>Explorar Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={`https://wa.me/${whaNum}?text=Hola%20Sumilisto,%20deseo%20asesor%C3%ADa%20sobre%20suministros%20para%20mi%20negocio`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-6 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <span>Consultar por WhatsApp</span>
          </a>
        </div>

        {/* Ventajas rápidas */}
        <div id="despachos" className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl text-xs sm:text-sm text-rose-200">
          <div className="flex items-center justify-center gap-2">
            <Truck className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span>{theme.despachoText || "Despacho Caracas / Guarenas / Guatire"}</span>
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
  );
}
