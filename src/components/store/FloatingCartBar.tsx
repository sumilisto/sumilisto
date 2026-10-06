"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/CartContext";
import { MOCK_PRODUCTS } from "@/lib/mock/products";
import { calculateProductPrice } from "@/lib/pricing/pricing";
import { formatUsd } from "@/lib/currency/format";
import { ShoppingBag, ArrowRight } from "lucide-react";

export const FloatingCartBar: React.FC = () => {
  const pathname = usePathname();
  const { items, itemCount } = useCart();

  // Calcular subtotal aproximado en el cliente para el floating bar
  const totalUsd = useMemo(() => {
    return items.reduce((acc, cartItem) => {
      const product = MOCK_PRODUCTS.find((p) => p.sku === cartItem.sku);
      if (!product || !product.isAvailable) return acc;
      const pricing = calculateProductPrice(product, cartItem.cantidad);
      return acc + pricing.subtotalUsd;
    }, 0);
  }, [items]);

  // No mostrar en la propia página de carrito ni si está vacío
  if (pathname === "/carrito" || itemCount === 0) {
    return null;
  }

  return (
    <aside aria-label="Resumen rápido del pedido" className="sm:hidden fixed bottom-14 left-0 right-0 z-30 px-3 pb-2 pointer-events-none">
      <Link
        href="/carrito"
        className="pointer-events-auto flex items-center justify-between w-full h-13 px-4 py-3 rounded-2xl bg-[#590317] text-white shadow-float active:scale-[0.98] transition-transform border border-rose-900/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs text-white">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-tight">Ver pedido</span>
            <span className="text-[11px] text-rose-200">
              {itemCount} {itemCount === 1 ? "unidad" : "unidades"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base font-black tracking-tight">
            {formatUsd(totalUsd)}
          </span>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </aside>
  );
};
