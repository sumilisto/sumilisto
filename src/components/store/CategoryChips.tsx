"use client";

import React from "react";
import Link from "next/link";
import { STORE_CATEGORIES } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";
import { Package, ShoppingBag, Utensils, Scroll, Layers } from "lucide-react";

interface CategoryChipsProps {
  activeCategory?: string;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ activeCategory }) => {
  const getIcon = (slug: string) => {
    switch (slug) {
      case "envases":
        return <Package className="w-4 h-4" />;
      case "bolsas":
        return <ShoppingBag className="w-4 h-4" />;
      case "cubiertos":
        return <Utensils className="w-4 h-4" />;
      case "papel":
        return <Scroll className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-none py-2 px-4 sm:px-6">
      <div className="flex items-center gap-2 min-w-max pb-1">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 touch-target border",
            !activeCategory
              ? "bg-[#590317] text-white border-[#590317] shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Todo el Catálogo</span>
        </Link>

        {STORE_CATEGORIES.map((cat) => {
          const isActive = activeCategory?.toLowerCase() === cat.slug.toLowerCase();
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 touch-target border",
                isActive
                  ? "bg-[#590317] text-white border-[#590317] shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {getIcon(cat.slug)}
              <span>{cat.nombre}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
