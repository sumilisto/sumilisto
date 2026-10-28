"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useProducts } from "@/lib/products/ProductsContext";
import { Product } from "@/types/product";
import { normalizeSearchString } from "@/lib/utils";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { Search, X, Package, ArrowRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface InstantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  bcvRate: number;
}

export const InstantSearchModal: React.FC<InstantSearchModalProps> = ({
  isOpen,
  onClose,
  bcvRate,
}) => {
  const router = useRouter();
  const { products } = useProducts();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPushedRef = useRef(false);
  const isBackdropTarget = useRef(false);

  // Manejo del botón Atrás (móvil y navegador) para cerrar el buscador
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ isSearchModalOpen: true }, "");
    isPushedRef.current = true;

    const handlePopState = () => {
      // El usuario presionó Atrás en el navegador o teléfono
      isPushedRef.current = false;
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Si se cerró por botón cerrar, escape o clic fuera, revertir la entrada del historial
      if (isPushedRef.current && window.history.state?.isSearchModalOpen) {
        isPushedRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  // Manejo de foco y scroll del body
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
      setResults([]);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Manejo de búsqueda en tiempo real
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const normalizedQuery = normalizeSearchString(query);
    const filtered = products.filter((product) => {
      const matchName = normalizeSearchString(product.nombre).includes(normalizedQuery);
      const matchSku = normalizeSearchString(product.sku).includes(normalizedQuery);
      const matchCat = normalizeSearchString(product.categoria).includes(normalizedQuery);
      const matchSub = product.subcategoria
        ? normalizeSearchString(product.subcategoria).includes(normalizedQuery)
        : false;
      const matchTags = product.etiquetas?.some((tag) =>
        normalizeSearchString(tag).includes(normalizedQuery)
      );

      return matchName || matchSku || matchCat || matchSub || matchTags;
    });

    setResults(filtered.slice(0, 8)); // Top 8 resultados rápidos
  }, [query, products]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Clic/Tap fuera del contenedor para cerrar el buscador
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isBackdropTarget.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isBackdropTarget.current && e.target === e.currentTarget) {
      onClose();
    }
    isBackdropTarget.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isBackdropTarget.current = e.target === e.currentTarget;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isBackdropTarget.current && e.target === e.currentTarget) {
      onClose();
    }
    isBackdropTarget.current = false;
  };

  const handleProductSelect = (
    e: React.MouseEvent<HTMLAnchorElement>,
    productSlug: string
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    isPushedRef.current = false;
    onClose();
    router.replace(`/producto/${productSlug}`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscador de suministros"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 px-4 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Barra de Entrada de Búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar bolsas, vasos, empaques, cajas..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Cerrar (Esc)
          </button>
        </div>

        {/* Contenedor de Resultados */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {query.trim() === "" ? (
            <div className="py-8 text-center text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">Comienza a escribir para ver suministros</p>
              <p className="text-xs text-slate-400 mt-1">
                Sugerencias rápidas: Envases térmicos, Bolsas delivery, Cubiertos sellados, Papel antigrasa.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                No encontramos productos para &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Verifica la ortografía o intenta buscar por categoría general (Envases, Bolsas, etc.)
              </p>
            </div>
          ) : (
            results.map((product) => {
              const vesAmount = calculateVesTotal(product.precioMayorUsd ?? 0, bcvRate);
              return (
                <Link
                  key={product.sku}
                  href={`/producto/${product.slug}`}
                  onClick={(e) => handleProductSelect(e, product.slug)}
                  className="flex items-center gap-3.5 py-3 hover:bg-slate-50 rounded-xl px-2 transition-colors group"
                >
                  <div className="relative w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                    <Image
                      src={product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=200&q=80"}
                      alt={product.nombre}
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        {product.categoria}
                      </span>
                      <span className="text-[10px] text-slate-400">· {product.sku}</span>
                      <Badge status={product.status} className="scale-90 origin-left" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-brand transition-colors">
                      {product.nombre}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      Presentación: {product.presentacion}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {product.isAvailable && product.precioMayorUsd ? (
                      <>
                        <div className="text-sm font-bold text-slate-900">
                          {formatUsd(product.precioMayorUsd)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatVes(vesAmount)}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Consultar</span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
