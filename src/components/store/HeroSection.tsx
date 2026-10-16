"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme/ThemeContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HeroSection() {
  const { theme } = useTheme();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteracting = useRef(false);

  const slides = theme.heroSlides || [];
  const hasSlides = slides.length > 0;

  // Medidas configurables desde el panel de administración
  const heightMap: Record<string, string> = {
    sm: "h-[240px] sm:h-[300px]",
    md: "h-[320px] sm:h-[420px]",
    lg: "h-[400px] sm:h-[520px]",
    xl: "h-[480px] sm:h-[620px]",
  };
  const cardHeight = heightMap[theme.heroHeight || "sm"] || heightMap.sm;

  // Sincronizar scroll manual / touch con los puntos indicadores
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;
    const newIndex = Math.round(scrollLeft / (clientWidth * 0.88));
    if (newIndex >= 0 && newIndex < slides.length && newIndex !== activeSlide) {
      setActiveSlide(newIndex);
    }
  };

  const scrollToSlide = (index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cards = container.querySelectorAll<HTMLElement>("[data-hero-slide]");
    if (cards[index]) {
      cards[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setActiveSlide(index);
    }
  };

  // Auto-play suave cada 5 segundos si el usuario no está interactuando
  useEffect(() => {
    if (!hasSlides || slides.length <= 1) return;

    const interval = setInterval(() => {
      if (!isInteracting.current) {
        setActiveSlide((prev) => {
          const next = (prev + 1) % slides.length;
          scrollToSlide(next);
          return next;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasSlides, slides.length]);

  // Si no hay slides configurados, mostrar el banner de bienvenida institucional
  if (!hasSlides) {
    const fallbackHeight = {
      sm: "py-4 sm:py-6 min-h-[160px] sm:min-h-[200px]",
      md: "py-6 sm:py-10 min-h-[220px] sm:min-h-[280px]",
      lg: "py-8 sm:py-14 min-h-[280px] sm:min-h-[360px]",
      xl: "py-10 sm:py-16 min-h-[340px] sm:min-h-[440px]",
    }[(theme.heroHeight as string) || "sm"];

    return (
      <section
        className={`bg-gradient-to-br from-brand via-brand-hover to-brand-active text-white ${fallbackHeight} px-4 sm:px-6 relative overflow-hidden flex items-center justify-center`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center text-center py-2">
          {theme.heroTitle && (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              {theme.heroTitle}
            </h1>
          )}
          {theme.heroSubtitle && (
            <p
              className="mt-2 text-xs sm:text-sm md:text-base text-white/90 max-w-2xl leading-relaxed"
              style={{ color: theme.topBarTextColor || "rgba(255,255,255,0.9)" }}
            >
              {theme.heroSubtitle}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/${theme.whatsappNumber}?text=Hola%20Sumilisto,%20deseo%20asesor%C3%ADa%20sobre%20suministros%20para%20mi%20negocio`}
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

  // Carrusel Promocional con Tarjetas Estilo App (con peeking lateral y botón de oferta)
  return (
    <section
      className="relative w-full py-3 sm:py-5 overflow-hidden"
      onMouseEnter={() => { isInteracting.current = true; }}
      onMouseLeave={() => { isInteracting.current = false; }}
      onTouchStart={() => { isInteracting.current = true; }}
      onTouchEnd={() => { isInteracting.current = false; }}
    >
      {/* Contenedor desplazable con snap y tarjetas laterales visibles */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-3 sm:gap-6 overflow-x-auto snap-x snap-mandatory px-[6vw] sm:px-[15vw] md:px-[22vw] lg:px-[26vw] scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, idx) => {
          const isVideo = slide.imageUrl && slide.imageUrl.match(/\.(mp4|webm|ogg)($|\?)/i);
          const isCurrent = idx === activeSlide;

          return (
            <div
              key={idx}
              data-hero-slide
              className={`shrink-0 w-[86vw] sm:w-[500px] md:w-[600px] max-w-full ${cardHeight} snap-center rounded-3xl overflow-hidden relative shadow-lg border border-slate-200/70 transition-all duration-300 ${
                isCurrent ? "scale-100 opacity-100" : "scale-[0.96] opacity-75"
              }`}
            >
              {/* Contenido multimedia (Imagen, GIF animado o Video) */}
              {isVideo ? (
                <video
                  src={slide.imageUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <img
                  src={slide.imageUrl}
                  alt={slide.title || `Promoción ${idx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              )}

              {/* Degradado sutil inferior para destacar texto y botón */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Textos opcionales sobre el banner si están definidos */}
              {(slide.title || slide.subtitle) && (
                <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
                  {slide.title && (
                    <h3 className="text-white text-base sm:text-xl font-black drop-shadow-md">
                      {slide.title}
                    </h3>
                  )}
                  {slide.subtitle && (
                    <p className="text-white/90 text-xs sm:text-sm drop-shadow font-medium mt-0.5">
                      {slide.subtitle}
                    </p>
                  )}
                </div>
              )}

              {/* Botón flotante para redireccionar a la oferta */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center z-20 px-4">
                <Link
                  href={slide.linkUrl || "#catalogo"}
                  className="py-2.5 sm:py-3 px-6 sm:px-8 rounded-full bg-white hover:bg-slate-50 active:scale-95 text-brand font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 border border-slate-100 hover:scale-105"
                >
                  <span>{slide.buttonText || "VER OFERTAS"}</span>
                </Link>
              </div>

              {/* Enlace global en la tarjeta para fácil clic */}
              {slide.linkUrl && (
                <Link
                  href={slide.linkUrl}
                  className="absolute inset-0 z-0"
                  aria-label={slide.buttonText || "Ver oferta"}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Flechas de navegación para escritorio */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToSlide(activeSlide === 0 ? slides.length - 1 : activeSlide - 1)}
            aria-label="Anterior"
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border border-slate-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSlide(activeSlide === slides.length - 1 ? 0 : activeSlide + 1)}
            aria-label="Siguiente"
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border border-slate-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicadores de puntos inferiores (...) */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToSlide(idx)}
              aria-label={`Ir al slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeSlide ? "bg-brand w-6 shadow-xs" : "bg-slate-300 hover:bg-slate-400 w-2"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
