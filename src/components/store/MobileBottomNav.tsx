"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme/ThemeContext";
import { DEFAULT_SETTINGS } from "@/lib/constants/settings";
import { Home, LayoutGrid, Truck } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  bcvRate?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  const pathname = usePathname();
  const { theme } = useTheme();

  const navItems = [
    {
      label: theme.navLabelInicio || DEFAULT_SETTINGS.navLabelInicio || "Inicio",
      href: "/",
      icon: Home,
      isExternal: false,
    },
    {
      label: theme.navLabelCategorias || DEFAULT_SETTINGS.navLabelCategorias || "Categorías",
      href: "/#categorias",
      icon: LayoutGrid,
      isExternal: false,
    },
    {
      label: theme.navLabelDespachos || DEFAULT_SETTINGS.navLabelDespachos || "Despachos",
      href: "/#despachos",
      icon: Truck,
      isExternal: false,
    },
    {
      label: "WhatsApp",
      href: "https://wa.me/584227864547",
      icon: WhatsAppIcon,
      isExternal: true,
    },
  ];

  const navBg = theme.bottomNavBgColor || "#ffffff";
  const navText = theme.bottomNavTextColor || "#475569";
  const navActive = theme.bottomNavActiveColor || theme.brandColor || "#166534";

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] px-3 py-1 safe-area-pb transition-colors"
      aria-label="Navegación principal móvil"
    >
      <div className="grid grid-cols-4 items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isExternal && pathname === item.href;

          if (item.isExternal) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: navActive }}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl touch-target transition-all hover:opacity-90 active:scale-90"
                aria-label="Abrir chat de WhatsApp"
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="w-5 h-5 mb-1" />
                </div>
                <span className="text-[11px] font-bold leading-none tracking-tight">{item.label}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              style={{ color: isActive ? navActive : navText }}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-1 rounded-xl touch-target transition-all active:scale-90",
                isActive ? "font-bold" : "font-medium hover:text-slate-900"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={cn("w-5 h-5 mb-1 transition-transform", isActive && "scale-110")} />
              </div>
              <span className="text-[11px] leading-none tracking-tight">{item.label}</span>
              {isActive && (
                <span
                  style={{ backgroundColor: navActive }}
                  className="w-1.5 h-1.5 rounded-full mt-1 transition-all"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
