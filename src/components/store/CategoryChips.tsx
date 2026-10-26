"use client";

import React from "react";
import Link from "next/link";
import { STORE_CATEGORIES } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";
import { Package, ShoppingBag, Utensils, Scroll, Layers } from "lucide-react";

import { useTheme } from "@/lib/theme/ThemeContext";

interface CategoryChipsProps {
  activeCategory?: string;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ activeCategory }) => {
  const { theme } = useTheme();
  const deleted = (theme?.deletedCategories || []).map((c) => c.toLowerCase());

  const visibleBaseCategories = STORE_CATEGORIES.filter(
    (c) => !deleted.includes(c.slug.toLowerCase()) && !deleted.includes(c.nombre.toLowerCase())
  );

  const customCategories = (theme?.customCategories || []).filter(
    (c) =>
      !deleted.includes(c.toLowerCase()) &&
      !STORE_CATEGORIES.some(
        (sc) =>
          sc.nombre.toLowerCase() === c.toLowerCase() ||
          sc.slug.toLowerCase() === c.toLowerCase()
      )
  );

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
              ? "bg-brand text-white border-brand shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Todo el Catálogo</span>
        </Link>

        {visibleBaseCategories.map((cat) => {
          const isActive = activeCategory?.toLowerCase() === cat.slug.toLowerCase();
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 touch-target border",
                isActive
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {getIcon(cat.slug)}
              <span>{cat.nombre}</span>
            </Link>
          );
        })}

        {customCategories.map((cat) => {
          const catSlug = cat.toLowerCase().replace(/\s+/g, "-");
          const isActive = activeCategory?.toLowerCase() === catSlug || activeCategory?.toLowerCase() === cat.toLowerCase();
          return (
            <Link
              key={cat}
              href={`/categoria/${catSlug}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 touch-target border capitalize",
                isActive
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Layers className="w-4 h-4" />
              <span>{cat}</span>
            </Link>
          );
        })}

        {activeCategory &&
          !visibleBaseCategories.some((c) => c.slug.toLowerCase() === activeCategory.toLowerCase()) &&
          !customCategories.some(
            (c) =>
              c.toLowerCase() === activeCategory.toLowerCase() ||
              c.toLowerCase().replace(/\s+/g, "-") === activeCategory.toLowerCase()
          ) && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-brand text-white border-brand shadow-sm capitalize">
              <Layers className="w-4 h-4" />
              <span>{decodeURIComponent(activeCategory).replace(/-/g, " ")}</span>
            </span>
          )}
      </div>
    </div>
  );
};
