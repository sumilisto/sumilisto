"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  CupSoda,
  Package,
  CakeSlice,
  Box,
  Utensils,
  Scroll,
  Truck,
  Sparkles,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryItem {
  id: string;
  label: string;
  badge?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ringGradient: string;
  bgGradient: string;
  iconColor: string;
}

const APP_STORIES: StoryItem[] = [
  {
    id: "promos",
    label: "15% OFF",
    badge: "Divisas",
    href: "/preguntas-frecuentes",
    icon: Percent,
    ringGradient: "from-amber-400 via-amber-500 to-orange-500",
    bgGradient: "bg-gradient-to-br from-amber-50 to-orange-50",
    iconColor: "text-amber-600",
  },
  {
    id: "bolsas",
    label: "Bolsas",
    href: "/categoria/bolsas",
    icon: ShoppingBag,
    ringGradient: "from-emerald-500 via-green-600 to-teal-700",
    bgGradient: "bg-gradient-to-br from-emerald-50 to-teal-50",
    iconColor: "text-emerald-700",
  },
  {
    id: "vasos",
    label: "Vasos",
    href: "/categoria/vasos",
    icon: CupSoda,
    ringGradient: "from-teal-400 via-cyan-500 to-emerald-600",
    bgGradient: "bg-gradient-to-br from-teal-50 to-cyan-50",
    iconColor: "text-teal-700",
  },
  {
    id: "cajas",
    label: "Cajas",
    href: "/categoria/cajas",
    icon: Package,
    ringGradient: "from-amber-500 via-orange-600 to-amber-700",
    bgGradient: "bg-gradient-to-br from-amber-50 to-yellow-50",
    iconColor: "text-amber-800",
  },
  {
    id: "moldes",
    label: "Repostería",
    href: "/categoria/moldes",
    icon: CakeSlice,
    ringGradient: "from-pink-500 via-rose-500 to-red-500",
    bgGradient: "bg-gradient-to-br from-pink-50 to-rose-50",
    iconColor: "text-rose-600",
  },
  {
    id: "envases",
    label: "Envases",
    href: "/categoria/envases",
    icon: Box,
    ringGradient: "from-sky-500 via-blue-600 to-emerald-600",
    bgGradient: "bg-gradient-to-br from-sky-50 to-blue-50",
    iconColor: "text-sky-700",
  },
  {
    id: "cubiertos",
    label: "Cubiertos",
    href: "/categoria/cubiertos",
    icon: Utensils,
    ringGradient: "from-slate-500 via-zinc-600 to-emerald-700",
    bgGradient: "bg-gradient-to-br from-slate-50 to-zinc-50",
    iconColor: "text-slate-700",
  },
  {
    id: "papel",
    label: "Papel",
    href: "/categoria/papel",
    icon: Scroll,
    ringGradient: "from-orange-400 via-amber-500 to-emerald-600",
    bgGradient: "bg-gradient-to-br from-amber-50 to-stone-50",
    iconColor: "text-amber-700",
  },
  {
    id: "despachos",
    label: "Despachos",
    href: "/#despachos",
    icon: Truck,
    ringGradient: "from-blue-500 via-indigo-600 to-emerald-600",
    bgGradient: "bg-gradient-to-br from-blue-50 to-indigo-50",
    iconColor: "text-blue-700",
  },
];

export const AppStoriesBar: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section aria-label="Accesos rápidos" className="w-full bg-white border-b border-slate-100/80 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto scrollbar-none flex gap-3.5 sm:gap-5 px-4 sm:px-6"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {APP_STORIES.map((story) => {
          const Icon = story.icon;
          return (
            <Link
              key={story.id}
              href={story.href}
              className="group flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
            >
              {/* Círculo exterior con degradado estilo historia de App */}
              <div
                className={cn(
                  "relative p-[2px] rounded-full bg-gradient-to-tr shadow-xs transition-transform duration-200 group-hover:scale-105",
                  story.ringGradient
                )}
              >
                <div
                  className={cn(
                    "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center p-2.5 bg-white border border-white",
                    story.bgGradient
                  )}
                >
                  <Icon className={cn("w-6 h-6 sm:w-7 sm:h-7 stroke-[2]", story.iconColor)} />
                </div>

                {story.badge && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-xs border border-white">
                    {story.badge}
                  </span>
                )}
              </div>

              {/* Etiqueta de la historia */}
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 group-hover:text-brand transition-colors text-center whitespace-nowrap">
                {story.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
