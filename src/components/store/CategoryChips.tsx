"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { STORE_CATEGORIES } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";
import { useTheme } from "@/lib/theme/ThemeContext";

interface CategoryChipsProps {
  activeCategory?: string;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ activeCategory }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const deleted = (theme?.deletedCategories || []).map((c) => c.toLowerCase());

  // Asegura que al cargar o cambiar categoría, el scroll inicie desde el principio (scrollLeft = 0)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [activeCategory]);

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

  const AllIcon = getCategoryIcon("todo");

  return (
    <div
      ref={scrollRef}
      className="w-full overflow-x-auto scrollbar-none py-2 px-4 sm:px-6"
    >
      <div className="flex items-center gap-2 min-w-max pb-1 pl-0">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 touch-target border",
            !activeCategory
              ? "bg-brand text-white border-brand shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <AllIcon className="w-4 h-4" />
          <span>Todo el Catálogo</span>
        </Link>

        {visibleBaseCategories.map((cat) => {
          const isActive = activeCategory?.toLowerCase() === cat.slug.toLowerCase();
          const IconComponent = getCategoryIcon(cat.nombre || cat.slug);
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
              <IconComponent className="w-4 h-4" />
              <span>{cat.nombre}</span>
            </Link>
          );
        })}

        {customCategories.map((cat) => {
          const catSlug = cat.toLowerCase().replace(/\s+/g, "-");
          const isActive =
            activeCategory?.toLowerCase() === catSlug ||
            activeCategory?.toLowerCase() === cat.toLowerCase();
          const IconComponent = getCategoryIcon(cat);
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
              <IconComponent className="w-4 h-4" />
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
          ) && (() => {
            const label = decodeURIComponent(activeCategory).replace(/-/g, " ");
            const ActiveCustomIcon = getCategoryIcon(label);
            return (
              <span className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-brand text-white border-brand shadow-sm capitalize">
                <ActiveCustomIcon className="w-4 h-4" />
                <span>{label}</span>
              </span>
            );
          })()}
      </div>
    </div>
  );
};
