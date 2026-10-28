"use client";

import React, { useState, useEffect } from "react";

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Si ya se mostró en esta sesión, no volver a bloquear al usuario
    if (typeof window !== "undefined" && sessionStorage.getItem("sumi_splash_viewed")) {
      setIsVisible(false);
      return;
    }

    // Duración optimizada para no penalizar métricas Core Web Vitals (LCP / FCP)
    const timer = setTimeout(() => {
      setIsFading(true);
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        try {
          sessionStorage.setItem("sumi_splash_viewed", "1");
        } catch {}
      }, 250);
      return () => clearTimeout(hideTimer);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <aside
      id="app-splash-screen"
      aria-label="Cargando Sumilisto"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#166534] transition-opacity duration-400 ease-out select-none ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#166534",
      }}
    >
      <style>{`
        @keyframes splashLogoPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.35;
            transform: scale(0.96);
          }
        }
        .splash-pulsing-logo {
          animation: splashLogoPulse 0.9s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col items-center justify-center px-6 text-center">
        {/* Logotipo oficial Sumi en blanco puro con animación de parpadeo/carga */}
        <div className="relative w-56 sm:w-72 max-w-[80vw] h-28 sm:h-36 flex items-center justify-center splash-pulsing-logo">
          <img
            src="/logo.png"
            alt="Sumi"
            className="w-full h-full object-contain filter drop-shadow-md"
            loading="eager"
          />
        </div>

        {/* Indicador de carga sutil y elegante en blanco */}
        <div className="flex items-center gap-2 mt-6">
          <span className="w-2.5 h-2.5 rounded-full bg-white/40 animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/70 animate-pulse [animation-delay:200ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse [animation-delay:400ms]" />
        </div>
      </div>
    </aside>
  );
};
