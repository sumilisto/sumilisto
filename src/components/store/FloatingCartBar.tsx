"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/CartContext";
import { useProducts } from "@/lib/products/ProductsContext";
import { formatUsd } from "@/lib/currency/format";
import { ShoppingBag, ArrowRight } from "lucide-react";

export const FloatingCartBar: React.FC = () => {
  const pathname = usePathname();
  const { items, itemCount } = useCart();
  const { products } = useProducts();

  // Calcular subtotal exacto en el cliente para el floating bar resolviendo variantes y productos
  const totalUsd = useMemo(() => {
    return items.reduce((acc, cartItem) => {
      if (!cartItem.cantidad || cartItem.cantidad <= 0) return acc;

      // 1. Buscar producto por SKU directo o por SKU de sus variantes
      let product = products.find((p) => p.sku === cartItem.sku);
      let variant = product?.variantes?.find((v) => v.sku === cartItem.sku);

      if (!product) {
        product = products.find((p) => p.variantes?.some((v) => v.sku === cartItem.sku));
        variant = product?.variantes?.find((v) => v.sku === cartItem.sku);
      }

      if (product) {
        const precioMayor = variant?.precioMayorUsd ?? product.precioMayorUsd ?? 0;
        const precioGranMayor = variant?.precioGranMayorUsd ?? product.precioGranMayorUsd ?? 0;
        const minMayor = variant?.minMayor || product.minMayor || 50;
        const minGranMayor = variant?.minGranMayor || product.minGranMayor || 100;

        const aplicaGranMayor =
          precioGranMayor > 0 && minGranMayor > 0 && cartItem.cantidad >= minGranMayor;

        const unidadesPorPaquete = aplicaGranMayor ? minGranMayor : minMayor;
        const precioPaquete = aplicaGranMayor ? precioGranMayor : precioMayor;
        const subtotal =
          Math.round(precioPaquete * (cartItem.cantidad / unidadesPorPaquete) * 100) / 100;

        return acc + subtotal;
      }

      // 2. Fallback resiliente si el item almacenó su subtotal en el carrito
      if (typeof cartItem.subtotalUsd === "number" && cartItem.subtotalUsd > 0) {
        return acc + cartItem.subtotalUsd;
      }

      return acc;
    }, 0);
  }, [items, products]);

  const totalUnits = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  }, [items]);

  // No mostrar en la propia página de carrito ni si está vacío
  if (pathname === "/carrito" || itemCount === 0) {
    return null;
  }

  const productLabel = itemCount === 1 ? "1 producto" : `${itemCount} productos`;
  const qualifiesForFreeDelivery = totalUsd >= 50;
  const amountToFreeDelivery = Math.max(0, Math.round((50 - totalUsd) * 100) / 100);

  return (
    <aside aria-label="Resumen rápido del pedido" className="sm:hidden fixed bottom-14 left-0 right-0 z-30 px-3 pb-2 pointer-events-none">
      <Link
        href="/carrito"
        className="pointer-events-auto flex items-center justify-between w-full h-14 px-4 py-2.5 rounded-2xl bg-brand text-white shadow-float active:scale-[0.98] transition-transform border border-white/20"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs text-white">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold leading-tight">Ver pedido</span>
              {qualifiesForFreeDelivery ? (
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase tracking-tight">
                  ¡Delivery Gratis!
                </span>
              ) : (
                <span className="text-[10px] font-medium text-emerald-200">
                  Faltan ${amountToFreeDelivery.toFixed(2).replace(".", ",")} p/ Delivery Gratis
                </span>
              )}
            </div>
            <span className="text-[11px] text-emerald-100/90 font-medium">
              {productLabel} ({totalUnits} Und)
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
