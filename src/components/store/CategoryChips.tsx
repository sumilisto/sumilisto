"use client";

import React, { useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { STORE_CATEGORIES } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";
import { useTheme } from "@/lib/theme/ThemeContext";

interface CategoryChipsProps {
  activeCategory?: string;
}

interface CategoryChipItem {
  id: string;
  nombre: string;
  slug: string;
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

  // Lista unificada y deduplicada ordenada estrictamente en orden alfabético A-Z
  const categories = useMemo(() => {
    const map = new Map<string, CategoryChipItem>();

    // 1. Categorías base del sistema
    STORE_CATEGORIES.forEach((cat) => {
      const isDeleted =
        deleted.includes(cat.slug.toLowerCase()) ||
        deleted.includes(cat.nombre.toLowerCase());
      if (!isDeleted) {
        map.set(cat.slug.toLowerCase(), {
          id: cat.id,
          nombre: cat.nombre,
          slug: cat.slug,
        });
      }
    });

    // 2. Categorías personalizadas activas
    (theme?.customCategories || []).forEach((rawName) => {
      const cleanName = rawName.trim();
      if (!cleanName) return;
      const slug = cleanName.toLowerCase().replace(/\s+/g, "-");
      const isDeleted =
        deleted.includes(cleanName.toLowerCase()) ||
        deleted.includes(slug);
      if (!isDeleted && !map.has(slug)) {
        map.set(slug, {
          id: slug,
          nombre: cleanName,
          slug: slug,
        });
      }
    });

    // 3. Orden alfabético A-Z en español
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
    );
  }, [deleted, theme?.customCategories]);

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

        {categories.map((cat) => {
          const isActive =
            activeCategory?.toLowerCase() === cat.slug.toLowerCase() ||
            activeCategory?.toLowerCase() === cat.nombre.toLowerCase();
          const IconComponent = getCategoryIcon(cat.nombre || cat.slug);
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 touch-target border capitalize",
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

        {activeCategory &&
          !categories.some(
            (c) =>
              c.slug.toLowerCase() === activeCategory.toLowerCase() ||
              c.nombre.toLowerCase() === activeCategory.toLowerCase() ||
              c.slug.toLowerCase() === activeCategory.toLowerCase().replace(/\s+/g, "-")
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
