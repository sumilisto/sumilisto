"use client";

import React, { useState, useMemo } from "react";
import { Product } from "@/types/product";
import { ProductCard } from "@/components/store/ProductCard";
import { ArrowUpDown } from "lucide-react";

interface ProductCatalogGridProps {
  products: Product[];
  bcvRate: number;
}

type SortOption = "az" | "za" | "precio_asc" | "precio_desc";

export const ProductCatalogGrid: React.FC<ProductCatalogGridProps> = ({
  products,
  bcvRate,
}) => {
  // Orden inicial por defecto: "Destacados / Más pedidos"
  const [sortBy, setSortBy] = useState<SortOption>("az");

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      // Siempre priorizar productos con disponibilidad activa
      if (a.isAvailable !== b.isAvailable) {
        return a.isAvailable ? -1 : 1;
      }

      if (sortBy === "az") {
        return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      }

      if (sortBy === "za") {
        return b.nombre.localeCompare(a.nombre, "es", { sensitivity: "base" });
      }

      if (sortBy === "precio_asc") {
        const priceA = a.precioMayorUsd ?? 0;
        const priceB = b.precioMayorUsd ?? 0;
        return priceA - priceB;
      }

      if (sortBy === "precio_desc") {
        const priceA = a.precioMayorUsd ?? 0;
        const priceB = b.precioMayorUsd ?? 0;
        return priceB - priceA;
      }

      return 0;
    });
  }, [products, sortBy]);

  return (
    <section id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-1 sm:mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            Catálogo Completo de Productos ({sortedProducts.length})
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="catalog-sort-select" className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Ordenar por:
          </label>
          <div className="relative">
            <select
              id="catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 pl-3 pr-8 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer appearance-none shadow-xs"
            >
              <option value="az">Alfabético (A - Z)</option>
              <option value="za">Alfabético (Z - A)</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {sortedProducts.map((product) => (
          <ProductCard key={product.sku} product={product} bcvRate={bcvRate} />
        ))}
      </div>
    </section>
  );
};
