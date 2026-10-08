"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, ProductVariant } from "@/types/product";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { useCart } from "@/lib/cart/CartContext";
import {
  ChevronRight,
  ShieldCheck,
  Truck,
  MessageCircle,
  AlertCircle,
  Sparkles,
  Palette,
  Check,
  Share2,
  Plus,
  Minus,
  ShoppingBag,
} from "lucide-react";

interface ProductDetailViewProps {
  product: Product;
  bcvRate: number;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  bcvRate,
}) => {
  const { getItemQuantity, updateQuantity, addItem } = useCart();
  
  // Lista de variantes de color
  const variants = product.variantes && product.variantes.length > 0
    ? product.variantes
    : [
        {
          sku: product.sku,
          color: product.presentacion,
          presentacion: product.presentacion,
          precioMayorUsd: product.precioMayorUsd,
          minMayor: product.minMayor,
          precioGranMayorUsd: product.precioGranMayorUsd,
          minGranMayor: product.minGranMayor,
          stock: product.stock,
          status: product.status,
          isAvailable: product.isAvailable,
          fotos: product.fotos,
        } as ProductVariant,
      ];

  const [selectedSku, setSelectedSku] = useState<string>(
    variants.find((v) => v.isAvailable)?.sku || variants[0].sku
  );

  const activeVariant = variants.find((v) => v.sku === selectedSku) || variants[0];
  const currentQuantityInCart = getItemQuantity(activeVariant.sku);
  const minMayor = activeVariant.minMayor || 1;

  const [selectedQty, setSelectedQty] = useState<number>(
    currentQuantityInCart > 0 ? currentQuantityInCart : minMayor
  );
  const [copied, setCopied] = useState(false);

  const priceMayor = activeVariant.precioMayorUsd ?? 0;
  const priceGranMayor = activeVariant.precioGranMayorUsd ?? 0;
  const minGranMayor = activeVariant.minGranMayor ?? 0;

  const vesMayor = calculateVesTotal(priceMayor, bcvRate);
  const vesGranMayor = calculateVesTotal(priceGranMayor, bcvRate);

  const handleAddToCart = () => {
    if (!activeVariant.isAvailable) return;
    updateQuantity(activeVariant.sku, selectedQty);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${product.nombre} al Mayor | Sumilisto`,
          text: `Mira este suministro en Sumilisto: ${product.nombre} (${activeVariant.color})`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappInquiryUrl = `https://wa.me/584227894547?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar sobre el producto: ${product.nombre} (Color: ${activeVariant.color}, SKU: ${activeVariant.sku})`
  )}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
      {/* Columna Izquierda: Galería */}
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-inner">
          <Image
            src={product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=800&q=80"}
            alt={product.nombre}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
          />
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
            <Badge status={activeVariant.status} />
            {product.destacado && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#590317] text-white">
                Destacado
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-3 z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-black/70 text-white backdrop-blur-sm">
              Color: {activeVariant.color}
            </span>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400">
          Imágenes de referencia · Foto real de producto distribuido
        </div>
      </div>

      {/* Columna Derecha: Detalles, Variantes y Precios */}
      <div className="flex flex-col justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {product.categoria} {product.subcategoria ? `· ${product.subcategoria}` : ""}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
            {product.nombre}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 pb-4 border-b border-slate-100 flex-wrap">
            <span>SKU: <strong className="text-slate-700">{activeVariant.sku}</strong></span>
            <span>·</span>
            <span>Unidad Mínima: <strong className="text-slate-700">{minMayor} Unidades</strong></span>
            {activeVariant.stock > 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-700 font-semibold">Stock disponible ({activeVariant.stock})</span>
              </>
            )}
          </div>

          {/* Selector de Variantes de Color */}
          {variants.length > 1 && (
            <div className="mt-5 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
              <div className="text-xs font-bold uppercase tracking-wider text-[#590317] mb-2.5 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#590317]" />
                <span>Selecciona el Color ({variants.length} opciones disponibles):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const isSelected = v.sku === selectedSku;
                  return (
                    <button
                      key={v.sku}
                      type="button"
                      onClick={() => {
                        setSelectedSku(v.sku);
                        setSelectedQty(v.minMayor || 1);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? "bg-[#590317] text-white border-[#590317] shadow-sm scale-105"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{v.color}</span>
                      {!v.isAvailable && (
                        <span className="text-[10px] text-rose-300 font-normal">(Agotado)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bloque de Precios en USD y Bs. */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Precio al Mayor (Desde {minMayor} Unidades)
            </div>
            {activeVariant.isAvailable && priceMayor > 0 ? (
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black text-[#590317]">
                  {formatUsd(priceMayor)}
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  / {minMayor} Unidades
                </span>
                <span className="text-sm font-bold text-slate-500">
                  ({formatVes(vesMayor)})
                </span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 font-semibold bg-white p-3 rounded-xl border border-slate-200">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span>Variante no disponible para compra directa en este momento.</span>
              </div>
            )}
          </div>

          {/* Tabla: Escala de Precios por Volumen */}
          {activeVariant.isAvailable && (
            <div className="mt-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#590317]" />
                <span>Escala de Precios Mayorista</span>
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Nivel</th>
                      <th className="py-2.5 px-3">Cantidad Mínima</th>
                      <th className="py-2.5 px-3">Precio USD</th>
                      <th className="py-2.5 px-3">Precio Ref. Bs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Mayor</td>
                      <td className="py-2.5 px-3 text-slate-600">{minMayor} Unidades</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatUsd(priceMayor)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatVes(vesMayor)}</td>
                    </tr>
                    {priceGranMayor > 0 && minGranMayor > 0 && (
                      <tr className="bg-emerald-50/50">
                        <td className="py-2.5 px-3 font-bold text-emerald-800">
                          Gran Mayor
                        </td>
                        <td className="py-2.5 px-3 text-emerald-900 font-medium">A partir de {minGranMayor} Unidades</td>
                        <td className="py-2.5 px-3 font-black text-emerald-900">{formatUsd(priceGranMayor)}</td>
                        <td className="py-2.5 px-3 text-emerald-700">{formatVes(vesGranMayor)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Descripción */}
          {product.descripcionLarga && (
            <div className="mt-5 text-sm text-slate-600 leading-relaxed">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Descripción del Suministro
              </h2>
              <p className="whitespace-pre-line">{product.descripcionLarga}</p>
            </div>
          )}
        </div>

        {/* Acciones de Compra y Botones */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
          {activeVariant.isAvailable ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Selector de Cantidad */}
              <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setSelectedQty((prev) => Math.max(minMayor, prev - 1))}
                  disabled={selectedQty <= minMayor}
                  aria-label="Disminuir cantidad"
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-200 transition-colors shadow-xs touch-target"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="px-4 text-center font-black text-slate-900 text-base min-w-[3rem]">
                  {selectedQty}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQty((prev) => prev + 1)}
                  aria-label="Aumentar cantidad"
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition-colors shadow-xs touch-target"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Botón Agregar al Carrito */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#590317] hover:bg-[#73041e] active:bg-[#400210] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all touch-target"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>
                  {currentQuantityInCart > 0
                    ? `Actualizar pedido (${selectedQty} Unidades)`
                    : `Agregar ${activeVariant.color} al Pedido`}
                </span>
              </button>
            </div>
          ) : (
            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base shadow-sm transition-colors touch-target"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Consultar disponibilidad por WhatsApp</span>
            </a>
          )}

          <div className="flex items-center gap-2">
            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 font-semibold text-xs sm:text-sm transition-colors touch-target"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Consultar duda</span>
            </a>

            <button
              type="button"
              onClick={handleShare}
              className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors touch-target"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copiado" : "Compartir"}</span>
            </button>
          </div>

          {/* Garantías */}
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              <Truck className="w-4 h-4 text-[#590317] flex-shrink-0" />
              <span>Despacho Caracas / Guarenas / Guatire</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Confirmación vía WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
