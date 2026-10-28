"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";
import { Badge } from "@/components/ui/Badge";
import { formatUsd } from "@/lib/currency/format";
import { useCart } from "@/lib/cart/CartContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Plus, Minus, AlertCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";

interface ProductCardProps {
  product: Product;
  bcvRate?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  bcvRate = 880.12,
}) => {
  const { getItemQuantity, addItem, updateQuantity, removeItem } = useCart();
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

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const step = minMayor || 1;
    const nextQty = quantity - step;
    if (nextQty <= 0) {
      removeItem(currentSku);
    } else {
      updateQuantity(currentSku, nextQty);
    }
  };

  const whatsappNum = theme.whatsappNumber || "";
  const whatsappInquiryUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar disponibilidad y precio del producto: ${product.nombre} (SKU: ${currentSku})`
  )}`;

  const categorySize = theme.cardCategoryFontSize || "11px";
  const titleSize = theme.cardTitleFontSize || "13px";
  const mayorSize = theme.cardMayorFontSize || "15px";
  const granMayorSize = theme.cardGranMayorFontSize || "14px";
  const padY = theme.cardPaddingY || "4px";
  const padX = theme.cardPaddingX || "10px";
  const lineSpacing = theme.cardLineSpacing || "3px";

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.025)] hover:border-slate-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:scale-[0.985] transition-all duration-200 overflow-hidden">
      {/* Contenedor de la Imagen con Botón '+' o Píldora [- 50 +] */}
      <div className="relative aspect-square w-full bg-slate-50/60 overflow-hidden">
        <Link href={`/producto/${product.slug}`} className="absolute inset-0 block">
          <Image
            src={primaryPhoto}
            alt={`${product.nombre} - Venta al Mayor y Gran Mayor en Venezuela | Sumilisto`}
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

        {/* Botón '+' redondo cuando quantity===0 o Píldora [- 50 +] compacta cuando quantity>0 */}
        {activeVariant.isAvailable ? (
          quantity > 0 ? (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="absolute bottom-2 right-2 z-20 bg-brand text-white rounded-xl p-0.5 shadow-md flex items-center gap-1 border border-white/20"
            >
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Disminuir cantidad de ${product.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-white/20 active:scale-90 flex items-center justify-center transition-all text-white"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="text-xs font-black min-w-[1.4rem] px-0.5 text-center select-none leading-none text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                aria-label={`Aumentar cantidad de ${product.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-white/20 active:scale-90 flex items-center justify-center transition-all text-white"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleIncrement}
              aria-label={`Agregar ${product.nombre} al pedido`}
              className="absolute bottom-2 right-2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand text-white shadow-md hover:bg-brand-hover active:scale-90 transition-all flex items-center justify-center"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          )
        ) : (
          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Consultar por WhatsApp"
            className="absolute bottom-2 right-2 z-20 w-8 h-8 rounded-xl bg-white/90 text-brand shadow-md hover:bg-white flex items-center justify-center"
          >
            <WhatsAppIcon className="w-4 h-4 text-brand" />
          </a>
        )}
      </div>

      {/* Información del producto según diseño de imagen y configuración de theme */}
      <div
        style={{
          paddingTop: padY,
          paddingBottom: padY,
          paddingLeft: padX,
          paddingRight: padX,
        }}
        className="flex flex-col flex-1 justify-between"
      >
        <div>
          {/* 1. Categoría en gris neutro sutil para no competir con el verde de acción */}
          {product.categoria && (
            <p
              style={{ fontSize: categorySize }}
              className="font-semibold text-slate-500 leading-tight truncate uppercase tracking-wider"
            >
              {product.categoria.split(",").map((c) => c.trim()).filter(Boolean).join(" · ")}
            </p>
          )}

          {/* 2. Nombre del producto en negrita con line-clamp-2 y altura uniforme */}
          <Link href={`/producto/${product.slug}`} className="block">
            <h3
              style={{ fontSize: titleSize, marginTop: lineSpacing }}
              className="font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.4em] hover:text-brand transition-colors"
            >
              {product.nombre}
            </h3>
          </Link>
        </div>

        {/* Bloque de Precios y Escala */}
        <div
          style={{ marginTop: lineSpacing, paddingTop: lineSpacing }}
          className="border-t border-slate-100"
        >
          {activeVariant.isAvailable && priceMayor > 0 ? (
            <div style={{ gap: lineSpacing }} className="flex flex-col">
              {/* 3. Sección Mayor */}
              <div>
                <span className="text-[11.5px] sm:text-xs font-semibold text-slate-500 block leading-tight">
                  Mayor: {minMayor} Und
                </span>
                <div className="mt-0.5">
                  <span
                    style={{ fontSize: theme.cardMayorFontSize || undefined }}
                    className="text-lg sm:text-xl font-black text-brand leading-tight block"
                  >
                    {formatUsd(priceMayor)}
                  </span>
                </div>
              </div>

              {/* 4. Sección Gran Mayor con fondo suave y borde casi invisible */}
              {priceGranMayor > 0 && minGranMayor > 0 && (() => {
                const regularEquivalent = minMayor > 0 ? (priceMayor / minMayor) * minGranMayor : priceMayor;
                const savings = regularEquivalent - priceGranMayor;
                return (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/60 w-full overflow-hidden">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight block mb-1.5">
                      Gran Mayor: {minGranMayor} Und
                    </span>
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        style={{ fontSize: theme.cardGranMayorFontSize || undefined }}
                        className="text-lg sm:text-xl font-black text-brand leading-tight block"
                      >
                        {formatUsd(priceGranMayor)}
                      </span>
                      {savings > 0.05 && (
                        <div className="flex flex-col items-center justify-center bg-amber-50 text-amber-900 border border-amber-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-center shrink-0">
                          <span className="text-[9.5px] sm:text-[10.5px] font-bold text-amber-800 leading-none">
                            Ahorras
                          </span>
                          <span className="text-[11px] sm:text-[12.5px] font-black text-amber-950 leading-tight mt-0.5">
                            ${savings.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
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
