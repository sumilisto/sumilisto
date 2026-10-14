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
    sm: "py-4 sm:py-6 min-h-[160px] sm:min-h-[220px]",
    md: "py-6 sm:py-10 min-h-[220px] sm:min-h-[300px]",
    lg: "py-8 sm:py-14 min-h-[280px] sm:min-h-[380px]",
  };
  const heightClass = heightMap[(theme.heroHeight as "sm"|"md"|"lg") || "sm"];

  const whaNum = theme.whatsappNumber;

  return (
    <section
      className={`bg-gradient-to-br from-brand via-brand-hover to-brand-active text-white ${heightClass} px-4 sm:px-6 relative overflow-hidden flex items-center justify-center`}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Carrusel de multimedia (Imágenes, GIFs y Videos) */}
      {hasSlides && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {theme.heroSlides.map((slide, idx) => {
            const isVideo = slide.imageUrl.match(/\.(mp4|webm|ogg)$/i);
            const isCurrent = idx === activeSlide;

            const mediaElement = isVideo ? (
              <video
                src={slide.imageUrl}
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-700 ${isCurrent ? "opacity-70" : "opacity-0 absolute inset-0"}`}
              />
            ) : (
              <img
                src={slide.imageUrl}
                alt={`Slide ${idx + 1}`}
                className={`w-full h-full object-cover transition-opacity duration-700 ${isCurrent ? "opacity-70" : "opacity-0 absolute inset-0"}`}
              />
            );

            return slide.linkUrl ? (
              <Link key={idx} href={slide.linkUrl} className="absolute inset-0 block">{mediaElement}</Link>
            ) : (
              <div key={idx} className="absolute inset-0">{mediaElement}</div>
            );
          })}

          {/* Navegación del carrusel */}
          {theme.heroSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveSlide(i => (i === 0 ? theme.heroSlides.length - 1 : i - 1))}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide(i => (i === theme.heroSlides.length - 1 ? 0 : i + 1))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {theme.heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`h-2 rounded-full transition-all ${idx === activeSlide ? "bg-white w-5" : "bg-white/50 w-2"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Contenido principal limpio sin badges ni lista inferior de ventajas */}
      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center text-center py-2">
        {theme.heroTitle && (
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
            {theme.heroTitle}
          </h1>
        )}

        {theme.heroSubtitle && (
          <p className="mt-2 text-xs sm:text-sm md:text-base text-white/90 max-w-2xl leading-relaxed" style={{ color: theme.topBarTextColor || "rgba(255,255,255,0.9)" }}>
            {theme.heroSubtitle}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#catalogo"
            className="h-10 sm:h-11 px-5 rounded-xl bg-white text-brand hover:opacity-95 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <span>Explorar Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={`https://wa.me/${whaNum}?text=Hola%20Sumilisto,%20deseo%20asesor%C3%ADa%20sobre%20suministros%20para%20mi%20negocio`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 sm:h-11 px-5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
