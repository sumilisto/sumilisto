"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, ProductVariant } from "@/types/product";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { useCart } from "@/lib/cart/CartContext";
import {
  ShieldCheck,
  Truck,
  MessageCircle,
  AlertCircle,
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
  const { getItemQuantity, updateQuantity } = useCart();
  
  // Lista de variantes de color
  const variants = product.variantes && product.variantes.length > 0
    ? product.variantes
    : [
        {
          sku: product.sku,
          color: product.color || product.presentacion,
          presentacion: product.presentacion,
          precioMayorUsd: product.precioMayorUsd,
          minMayor: product.minMayor || 100,
          precioGranMayorUsd: product.precioGranMayorUsd,
          minGranMayor: product.minGranMayor || 500,
          stock: product.stock || 500,
          status: product.status,
          isAvailable: product.isAvailable,
          fotos: product.fotos,
        } as ProductVariant,
      ];

  const [selectedSku, setSelectedSku] = useState<string>(
    variants.find((v) => v.isAvailable)?.sku || variants[0].sku
  );

  const activeVariant = variants.find((v) => v.sku === selectedSku) || variants[0];
  const minMayor = activeVariant.minMayor || 100;
  const minGranMayor = activeVariant.minGranMayor || 500;
  const priceMayor = activeVariant.precioMayorUsd ?? 0;
  const priceGranMayor = activeVariant.precioGranMayorUsd ?? 0;

  // Selección de Tarifa: "mayor" | "gran_mayor"
  const [selectedTier, setSelectedTier] = useState<"mayor" | "gran_mayor">("mayor");

  // Multiplicador de paquetes / lotes (1, 2, 3...)
  const [packCount, setPackCount] = useState<number>(1);
  const [comentarios, setComentarios] = useState<string>("");
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Unidades totales resultantes
  const unitsPerPack = selectedTier === "gran_mayor" ? minGranMayor : minMayor;
  const pricePerPack = selectedTier === "gran_mayor" ? priceGranMayor : priceMayor;
  const totalUnits = packCount * unitsPerPack;

  const totalUsd = Math.round(pricePerPack * packCount * 100) / 100;
  const totalVes = calculateVesTotal(totalUsd, bcvRate);

  const maxStock = activeVariant.stock > 0 ? activeVariant.stock : 500;
  const maxPacks = Math.max(1, Math.floor(maxStock / unitsPerPack));

  const handleAddToCart = () => {
    if (!activeVariant.isAvailable) return;
    updateQuantity(activeVariant.sku, totalUnits);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2500);
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
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappInquiryUrl = `https://wa.me/584227894547?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar sobre el producto: ${product.nombre} (Color: ${activeVariant.color}, SKU: ${activeVariant.sku}, Modalidad: ${selectedTier === "gran_mayor" ? "Gran Mayor" : "Mayor"} de ${totalUnits} unds)`
  )}`;

  return (
    <div className="flex flex-col gap-6 bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs max-w-4xl mx-auto">
      {/* 1. Encabezado principal: TÍTULO, SKU Y STOCK ARRIBA DE LA IMAGEN */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
          {product.nombre}
        </h1>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
          <span>SKU: <strong className="text-slate-700">{activeVariant.sku}</strong></span>
          <span>·</span>
          {activeVariant.stock > 0 ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Stock disponible: {activeVariant.stock} Unidades
            </span>
          ) : (
            <span className="text-rose-600 font-semibold">Agotado</span>
          )}
        </div>
      </div>

      {/* 2. Imagen del producto */}
      <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-inner">
        <Image
          src={product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=1000&q=80"}
          alt={product.nombre}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover object-center"
        />
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
          <Badge status={activeVariant.status} />
        </div>

        <div className="absolute bottom-3 left-3 z-10">
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-black/75 text-white backdrop-blur-sm shadow-sm">
            Color: {activeVariant.color}
          </span>
        </div>
      </div>

      {/* 3. Selector de Color (si hay múltiples variantes) */}
      {variants.length > 1 && (
        <div className="pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#590317]" />
            <span>Seleccionar Color ({variants.length} disponibles):</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => {
              const isSelected = v.sku === selectedSku;
              return (
                <button
                  key={v.sku}
                  type="button"
                  onClick={() => {
                    setSelectedSku(v.sku);
                    setPackCount(1);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border touch-target ${
                    isSelected
                      ? "bg-[#590317] text-white border-[#590317] shadow-sm scale-105"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? "bg-white" : "bg-[#590317]"}`}></span>
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

      {/* 4. Selector de Modalidad: MAYOR y GRAN MAYOR (Estilo Radio Buttons de la referencia) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
        {/* Opción MAYOR */}
        <label
          onClick={() => {
            setSelectedTier("mayor");
            setPackCount(1);
          }}
          className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
            selectedTier === "mayor" ? "bg-emerald-50/50" : "hover:bg-slate-50"
          }`}
        >
          <div>
            <div className="text-sm font-black text-slate-900 uppercase">
              MAYOR: {minMayor} unds
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              US$ {priceMayor.toFixed(2).replace(".", ",")}
              <span className="text-xs font-medium text-slate-500 ml-2">
                ({formatVes(calculateVesTotal(priceMayor, bcvRate))})
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <input
              type="radio"
              name="tierSelection"
              checked={selectedTier === "mayor"}
              onChange={() => {
                setSelectedTier("mayor");
                setPackCount(1);
              }}
              className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-[#25D366]"
            />
          </div>
        </label>

        {/* Opción GRAN MAYOR (si está configurada) */}
        {priceGranMayor > 0 && minGranMayor > 0 && (
          <label
            onClick={() => {
              setSelectedTier("gran_mayor");
              setPackCount(1);
            }}
            className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
              selectedTier === "gran_mayor" ? "bg-emerald-50/50" : "hover:bg-slate-50"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 uppercase">
                  GRAN MAYOR: {minGranMayor} unds
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  Ahorro por volumen
                </span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                US$ {priceGranMayor.toFixed(2).replace(".", ",")}
                <span className="text-xs font-medium text-slate-500 ml-2">
                  ({formatVes(calculateVesTotal(priceGranMayor, bcvRate))})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <input
                type="radio"
                name="tierSelection"
                checked={selectedTier === "gran_mayor"}
                onChange={() => {
                  setSelectedTier("gran_mayor");
                  setPackCount(1);
                }}
                className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-[#25D366]"
              />
            </div>
          </label>
        )}
      </div>

      {/* 5. Comentarios (Opcional) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Comentarios
        </label>
        <input
          type="text"
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          placeholder="(Opcional)"
          className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#590317]/20 focus:border-[#590317]"
        />
      </div>

      {/* 6. Barra de Acción Inferior: Contador [ - 1 + ] y Botón [ Agregar US$ XX.XX ] */}
      <div className="pt-2">
        {activeVariant.isAvailable ? (
          <div className="flex items-center gap-3">
            {/* Contador de paquetes/lotes */}
            <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setPackCount((prev) => Math.max(1, prev - 1))}
                disabled={packCount <= 1}
                aria-label="Disminuir lote"
                className="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-slate-700 disabled:opacity-30 hover:bg-slate-200 transition-colors shadow-xs touch-target font-bold text-lg"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="px-4 text-center font-black text-slate-900 text-base min-w-[2.5rem]">
                {packCount}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (packCount < maxPacks) {
                    setPackCount((prev) => prev + 1);
                  }
                }}
                disabled={packCount >= maxPacks}
                aria-label="Aumentar lote"
                className="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-emerald-700 disabled:opacity-30 hover:bg-slate-200 transition-colors shadow-xs touch-target font-bold text-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Botón Principal de Agregar con Monto en Vivo */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 h-13 px-6 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all touch-target ${
                addedFeedback
                  ? "bg-emerald-600 text-white"
                  : "bg-[#2F857D] hover:bg-[#266d66] active:bg-[#1d5550] text-white"
              }`}
            >
              {addedFeedback ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>¡Agregado al Pedido! ({totalUnits} unds)</span>
                </>
              ) : (
                <>
                  <span>Agregar US$ {totalUsd.toFixed(2).replace(".", ",")}</span>
                  <span className="text-xs font-normal opacity-90">({totalUnits} unds)</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-13 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base shadow-sm transition-colors touch-target"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Consultar disponibilidad por WhatsApp</span>
          </a>
        )}

        {packCount >= maxPacks && activeVariant.stock > 0 && (
          <div className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg mt-2 text-center">
            ⚠️ Has seleccionado el stock máximo disponible ({maxStock} Unidades).
          </div>
        )}
      </div>

      {/* 7. Descripción del Producto */}
      {product.descripcionLarga && (
        <div className="pt-4 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Descripción del Producto
          </h2>
          <p className="whitespace-pre-line">{product.descripcionLarga}</p>
        </div>
      )}

      {/* 8. Botón secundario y garantías */}
      <div className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-500">
        <a
          href={whatsappInquiryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-emerald-700 hover:underline font-semibold"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Consultar asesor por WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1 hover:text-slate-900 font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? "Copiado" : "Compartir"}</span>
        </button>
      </div>
    </div>
  );
};
