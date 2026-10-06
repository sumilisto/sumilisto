"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/CartContext";
import { Home, Layers, Search, ShoppingBag, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstantSearchModal } from "@/components/search/InstantSearchModal";

interface MobileBottomNavProps {
  bcvRate?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ bcvRate = 42.50 }) => {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { label: "Inicio", href: "/", icon: Home },
    { label: "Categorías", href: "/#categorias", icon: Layers },
    { label: "Buscar", action: () => setIsSearchOpen(true), icon: Search },
    { label: "Pedido", href: "/carrito", icon: ShoppingBag, badge: itemCount },
    {
      label: "WhatsApp",
      href: "https://wa.me/584227894547?text=Hola%20Sumilisto,%20quisiera%20hacer%20un%20pedido%20de%20suministros",
      icon: MessageCircle,
      external: true,
    },
  ];

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = !item.action && pathname === item.href;

            if (item.action) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-slate-600 hover:text-[#590317] touch-target transition-colors"
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </button>
              );
            }

            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-emerald-600 hover:text-emerald-700 touch-target transition-colors"
                >
                  <Icon className="w-5 h-5 mb-0.5 text-emerald-600" />
                  <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                </a>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1.5 px-3 rounded-lg touch-target transition-colors",
                  isActive
                    ? "text-[#590317] font-bold"
                    : "text-slate-600 hover:text-[#590317] font-medium"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mb-0.5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#590317] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
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
