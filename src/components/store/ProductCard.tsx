"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";
import { Badge } from "@/components/ui/Badge";
import { formatUsd } from "@/lib/currency/format";
import { useCart } from "@/lib/cart/CartContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Plus, MessageCircle, AlertCircle } from "lucide-react";

interface ProductCardProps {
  product: Product;
  bcvRate?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  bcvRate = 42.50,
}) => {
  const { getItemQuantity, addItem } = useCart();
  const { theme } = useTheme();
  
  const [selectedVariantSku] = useState<string>(
    product.variantes && product.variantes.length > 0 ? product.variantes[0].sku : product.sku
  );

  const activeVariant = product.variantes?.find(v => v.sku === selectedVariantSku) || product;
  const currentSku = activeVariant.sku;
  const quantity = getItemQuantity(currentSku);

  const priceMayor = activeVariant.precioMayorUsd ?? product.precioMayorUsd ?? 0;
  const priceGranMayor = activeVariant.precioGranMayorUsd ?? product.precioGranMayorUsd ?? 0;
  const minGranMayor = activeVariant.minGranMayor ?? product.minGranMayor ?? 0;
  const minMayor = activeVariant.minMayor ?? product.minMayor ?? 1;

  const primaryPhoto = product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=600&q=80";

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeVariant.isAvailable) return;
    const step = minMayor || 1;
    const maxStock = activeVariant.stock > 0 ? activeVariant.stock : 999999;
    if (quantity + step > maxStock) return;
    addItem(currentSku, step);
  };

  const whatsappNum = theme.whatsappNumber || "584227894547";
  const whatsappInquiryUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar disponibilidad y precio del producto: ${product.nombre} (SKU: ${currentSku})`
  )}`;

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-card transition-all duration-200 overflow-hidden">
      {/* Contenedor de la Imagen con Botón '+' en esquina inferior derecha */}
      <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
        <Link href={`/producto/${product.slug}`} className="absolute inset-0 block">
          <Image
            src={primaryPhoto}
            alt={product.fotos[0]?.alt || product.nombre}
            fill
            unoptimized={true}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>

        {/* Badge de estado superpuesto */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start pointer-events-none">
          <Badge status={activeVariant.status} />
          {product.destacado && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand text-white shadow-sm">
              Destacado
            </span>
          )}
        </div>

        {/* Botón '+' en la esquina inferior derecha dentro de la imagen */}
        {activeVariant.isAvailable ? (
          <button
            type="button"
            onClick={handleIncrement}
            aria-label={`Agregar ${product.nombre} al pedido`}
            className="absolute bottom-2.5 right-2.5 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand text-white shadow-md hover:bg-brand-hover active:scale-90 transition-all flex items-center justify-center touch-target"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            {quantity > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-sm">
                {quantity}
              </span>
            )}
          </button>
        ) : (
          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Consultar por WhatsApp"
            className="absolute bottom-2.5 right-2.5 z-20 w-10 h-10 rounded-2xl bg-white/90 text-emerald-600 shadow-md hover:bg-white flex items-center justify-center touch-target"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
        )}
      </div>

      {/* Información limpia del producto (sin categoría, sin SKU, sin botones de variantes) */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 justify-between">
        <div>
          <Link href={`/producto/${product.slug}`}>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 hover:text-brand transition-colors">
              {product.nombre}
            </h3>
          </Link>
        </div>

        {/* Bloque de Precios y Escala */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          {activeVariant.isAvailable && priceMayor > 0 ? (
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {formatUsd(priceMayor)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {product.unidadVenta}
                </span>
              </div>

              {/* Escala Gran Mayor */}
              {priceGranMayor > 0 && minGranMayor > 0 && (
                <div className="mt-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  Gran Mayor: {formatUsd(priceGranMayor)} (desde {minGranMayor} Unidades)
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>Precio a consultar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
