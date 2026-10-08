"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { useCart } from "@/lib/cart/CartContext";
import { Plus, Minus, MessageCircle, AlertCircle, Palette } from "lucide-react";

interface ProductCardProps {
  product: Product;
  bcvRate?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  bcvRate = 42.50,
}) => {
  const { getItemQuantity, addItem, updateQuantity } = useCart();
  
  // Manejo de variantes de color (si las tiene)
  const hasVariants = Boolean(product.variantes && product.variantes.length > 1);
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>(
    product.variantes && product.variantes.length > 0 ? product.variantes[0].sku : product.sku
  );

  const activeVariant = product.variantes?.find(v => v.sku === selectedVariantSku) || product;
  const currentSku = activeVariant.sku;
  const quantity = getItemQuantity(currentSku);

  const priceMayor = activeVariant.precioMayorUsd ?? product.precioMayorUsd ?? 0;
  const priceGranMayor = activeVariant.precioGranMayorUsd ?? product.precioGranMayorUsd ?? 0;
  const minGranMayor = activeVariant.minGranMayor ?? product.minGranMayor ?? 0;
  const minMayor = activeVariant.minMayor ?? product.minMayor ?? 1;

  const vesAmount = calculateVesTotal(priceMayor, bcvRate);
  const primaryPhoto = product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=600&q=80";

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeVariant.isAvailable) return;
    const step = minMayor || 1;
    const maxStock = activeVariant.stock > 0 ? activeVariant.stock : 999999;
    if (quantity + step > maxStock) return;
    if (quantity === 0) {
      addItem(currentSku, step);
    } else {
      addItem(currentSku, step);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const step = minMayor || 1;
    if (quantity <= step) {
      updateQuantity(currentSku, 0);
    } else {
      updateQuantity(currentSku, quantity - step);
    }
  };

  const whatsappInquiryUrl = `https://wa.me/584227894547?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar disponibilidad y precio del producto: ${product.nombre} (SKU: ${currentSku})`
  )}`;

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-card transition-all duration-200 overflow-hidden">
      {/* Imagen del producto */}
      <Link href={`/producto/${product.slug}`} className="relative aspect-square w-full bg-slate-50 overflow-hidden block">
        <Image
          src={primaryPhoto}
          alt={product.fotos[0]?.alt || product.nombre}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badge de estado superpuesto */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          <Badge status={activeVariant.status} />
          {product.destacado && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#590317] text-white shadow-sm">
              Destacado
            </span>
          )}
        </div>

        {/* Presentación / Color seleccionado */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
            {activeVariant.color && activeVariant.color !== "ESTÁNDAR" ? activeVariant.color : product.presentacion}
          </span>
        </div>
      </Link>

      {/* Información del producto */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4 justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {product.categoria} {product.subcategoria ? `· ${product.subcategoria}` : ""}
          </div>
          <Link href={`/producto/${product.slug}`}>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 hover:text-[#590317] transition-colors">
              {product.nombre}
            </h3>
          </Link>
          <div className="text-xs text-slate-500 mt-0.5">
            SKU: {currentSku}
          </div>

          {/* Selector rápido de colores (si tiene múltiples variantes) */}
          {hasVariants && (
            <div className="mt-2.5">
              <div className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3 text-[#590317]" />
                <span>Colores disponibles:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {product.variantes?.map((v) => {
                  const isSelected = v.sku === selectedVariantSku;
                  return (
                    <button
                      key={v.sku}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedVariantSku(v.sku);
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                        isSelected
                          ? "bg-[#590317] text-white border-[#590317] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {v.color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bloque de Precios y Escala */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          {activeVariant.isAvailable && priceMayor > 0 ? (
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-xl font-bold text-slate-900">
                  {formatUsd(priceMayor)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  / {product.unidadVenta}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  ({formatVes(vesAmount)})
                </span>
              </div>

              {/* Escala Gran Mayor */}
              {priceGranMayor > 0 && minGranMayor > 0 ? (
                <div className="mt-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  Gran Mayor: {formatUsd(priceGranMayor)} (desde {minGranMayor} Unidades)
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-slate-500">
                  Venta por volumen mayorista
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>Precio y existencias sujetas a confirmación</span>
            </div>
          )}

          {/* Botón de Acción / Selector de Cantidad */}
          <div className="mt-3.5">
            {activeVariant.isAvailable ? (
              quantity === 0 ? (
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#590317] hover:bg-[#73041e] active:bg-[#400210] text-white font-semibold text-sm transition-all shadow-sm touch-target"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar al pedido</span>
                </button>
              ) : (
                <div className="flex items-center justify-between w-full h-11 rounded-xl bg-slate-100 border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    aria-label="Disminuir cantidad"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 active:bg-slate-300 font-bold transition-colors touch-target shadow-xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-sm font-bold text-slate-900 px-2 text-center">
                    {quantity} <span className="text-xs font-normal text-slate-600">Unidades</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    aria-label="Aumentar cantidad"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#590317] text-white hover:bg-[#73041e] font-bold transition-colors touch-target shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )
            ) : (
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs sm:text-sm font-semibold transition-colors touch-target"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Consultar por WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
