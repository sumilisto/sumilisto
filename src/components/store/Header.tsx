"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart/CartContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { formatVes } from "@/lib/currency/format";
import { Search, ShoppingBag, MessageCircle, MapPin, Sparkles } from "lucide-react";
import { InstantSearchModal } from "@/components/search/InstantSearchModal";

interface HeaderProps {
  bcvRate?: number;
}

export const Header: React.FC<HeaderProps> = ({ bcvRate = 42.50 }) => {
  const { itemCount } = useCart();
  const { theme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* Barra superior de tasa oficial BCV y cobertura */}
      <div className="bg-brand-active text-rose-100 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">Tasa oficial BCV:</span>
            <span className="font-bold text-white">{formatVes(bcvRate)}</span>
            <span className="text-rose-200/80 hidden md:inline">· Precios en Bs. calculados al cambio oficial</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-200 text-[11px] justify-center">
            <MapPin className="w-3.5 h-3.5 text-rose-300" />
            <span>Despachos en Caracas, Guarenas y Guatire</span>
          </div>
        </div>
      </div>

      {/* Header principal */}
      <header className="sticky top-0 z-30 bg-brand text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo de Sumilisto */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            {theme.logoUrl ? (
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 overflow-hidden group-hover:scale-105 transition-transform">
                <Image src={theme.logoUrl} alt="Logo" fill className="object-contain" />
              </div>
            ) : (
              <>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white flex items-center justify-center text-brand font-black text-2xl shadow-inner group-hover:scale-105 transition-transform">
                  S
                </div>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-black tracking-tight leading-none text-white">
                    SUMILISTO
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider text-rose-200 uppercase mt-0.5">
                    Suministros al Mayor
                  </span>
                </div>
              </>
            )}
          </Link>

          {/* Barra de búsqueda (Escritorio / Tablet) */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-rose-100 border border-white/20 flex items-center justify-between text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-rose-200" />
                <span className="text-rose-200">Buscar envases, bolsas, cubiertos, papel...</span>
              </div>
              <kbd className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-bold bg-white/20 rounded text-white">
                Buscar
              </kbd>
            </button>
          </div>

          {/* Acciones de la derecha: Buscador móvil, WhatsApp y Carrito */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón de búsqueda para móvil */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Abrir buscador"
              className="sm:hidden w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white touch-target transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Enlace de WhatsApp directo */}
            <a
              href="https://wa.me/584227894547?text=Hola%20Sumilisto,%20quisiera%20hacer%20una%20consulta%20de%20suministros"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contactar por WhatsApp"
              className="hidden md:flex items-center gap-2 h-11 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Atención WhatsApp</span>
            </a>

            {/* Botón de Carrito de compras */}
            <Link
              href="/carrito"
              aria-label="Ver carrito de compras"
              className="relative flex items-center gap-2 h-11 px-3.5 sm:px-4 rounded-xl bg-white text-brand hover:bg-rose-50 active:bg-rose-100 font-bold text-sm transition-all shadow-sm touch-target"
            >
              <ShoppingBag className="w-5 h-5 text-brand" />
              <span className="hidden sm:inline">Pedido</span>
              {itemCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-black bg-brand text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Modal de búsqueda instantánea */}
      <InstantSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        bcvRate={bcvRate}
      />
    </>
  );
};
