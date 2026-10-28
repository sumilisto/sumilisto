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
      style={{ backgroundColor: navBg }}
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1 safe-area-pb transition-colors"
      aria-label="Navegación principal móvil"
    >
      <div className="grid grid-cols-4 items-center">
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
                style={{ color: "#25D366" }}
                className="flex flex-col items-center justify-center py-1.5 px-2 rounded-lg touch-target transition-all hover:opacity-90 active:scale-95"
                aria-label="Abrir chat de WhatsApp"
              >
                <Icon className="w-5 h-5 mb-0.5 text-[#25D366]" />
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              style={{ color: isActive ? navActive : navText }}
              className={cn(
                "relative flex flex-col items-center justify-center py-1.5 px-2 rounded-lg touch-target transition-colors",
                isActive ? "font-bold" : "font-medium hover:opacity-80"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
