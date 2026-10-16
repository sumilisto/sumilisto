"use client";

import React, { useState, useEffect } from "react";

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Mostrar la pantalla de presentación por 1.6 segundos al abrir o actualizar
    const timer = setTimeout(() => {
      setIsFading(true);
      // Tras 500ms de desvanecimiento suave (fade out), retirar del DOM
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(hideTimer);
    }, 1600);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <aside
      id="app-splash-screen"
      aria-label="Cargando Sumilisto"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#166534] transition-opacity duration-500 ease-out select-none ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#166534",
      }}
    >
      <div className="flex flex-col items-center justify-center px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Logotipo oficial Sumi en blanco puro */}
        <div className="relative w-56 sm:w-72 max-w-[80vw] h-28 sm:h-36 flex items-center justify-center">
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
