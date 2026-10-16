"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/CartContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { DEFAULT_SETTINGS } from "@/lib/constants/settings";
import { Home, Layers, Search, ShoppingBag, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstantSearchModal } from "@/components/search/InstantSearchModal";

interface MobileBottomNavProps {
  bcvRate?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ bcvRate = 880.12 }) => {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { theme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { label: theme.navLabelInicio || DEFAULT_SETTINGS.navLabelInicio, href: "/", icon: Home },
    { label: theme.navLabelCategorias || DEFAULT_SETTINGS.navLabelCategorias, href: "/#categorias", icon: Layers },
    { label: theme.navLabelCarrito || DEFAULT_SETTINGS.navLabelCarrito, href: "/carrito", icon: ShoppingBag, badge: itemCount },
    { label: theme.navLabelBuscar || DEFAULT_SETTINGS.navLabelBuscar, action: () => setIsSearchOpen(true), icon: Search },
    { label: theme.navLabelDespachos || DEFAULT_SETTINGS.navLabelDespachos, href: "#despachos", icon: Truck },
  ];

  const navBg = theme.bottomNavBgColor || "#ffffff";
  const navText = theme.bottomNavTextColor || "#475569";
  const navActive = theme.bottomNavActiveColor || theme.brandColor || "#166534";

  return (
    <>
      <nav
        style={{ backgroundColor: navBg }}
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1 safe-area-pb transition-colors"
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = !item.action && (pathname === item.href || (item.href === "/carrito" && pathname?.startsWith("/carrito")));

            if (item.action) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  style={{ color: navText }}
                  className="flex flex-col items-center justify-center py-1.5 px-3 rounded-lg touch-target transition-colors hover:opacity-80"
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                style={{ color: isActive ? navActive : navText }}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1.5 px-3 rounded-lg touch-target transition-colors",
                  isActive ? "font-bold" : "font-medium hover:opacity-80"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mb-0.5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      style={{ backgroundColor: navActive }}
                      className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs"
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <InstantSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        bcvRate={bcvRate}
      />
    </>
  );
};
