"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, ProductVariant } from "@/types/product";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { useCart } from "@/lib/cart/CartContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  ShieldCheck,
  Truck,
  MessageCircle,
  Palette,
  Check,
  Share2,
  Plus,
  Minus,
  AlertTriangle,
} from "lucide-react";

// ──── Galería de imágenes (hasta 10 fotos) ────
interface GalleryProps {
  photos: { url: string; alt?: string }[];
  productName: string;
  status: import("@/types/product").ProductStockStatus;
}
function ProductGallery({ photos, productName, status }: GalleryProps) {
  const safePhotos = photos.slice(0, 10);
  const [activeIdx, setActiveIdx] = useState(0);
  const mainUrl = safePhotos[activeIdx]?.url ||
    "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=1000&q=80";

  return (
    <div className="space-y-3 max-w-lg mx-auto w-full">
      <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-inner">
        <Image src={mainUrl} alt={productName} fill priority
          sizes="(max-width: 768px) 100vw, 512px"
          className="object-cover object-center" />
        <div className="absolute top-3 left-3 z-10">
          <Badge status={status} />
        </div>
        {safePhotos.length > 1 && (
          <>
            <button type="button" onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <button type="button" onClick={() => setActiveIdx(i => Math.min(safePhotos.length - 1, i + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </>
        )}
      </div>
      {safePhotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
          {safePhotos.map((photo, idx) => (
            <button key={idx} type="button" onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                idx === activeIdx ? "border-brand shadow-md" : "border-slate-200 opacity-60 hover:opacity-100"
              }`}>
              <img src={photo.url} alt={(photo as any).alt || productName} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductDetailViewProps {
  product: Product;
  bcvRate: number;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  bcvRate,
}) => {
  const { getItemQuantity, updateQuantity } = useCart();
  const { theme } = useTheme();
  
  // Lista de variantes de color
  const variants = product.variantes && product.variantes.length > 0
    ? product.variantes
    : [
        {
          sku: product.sku,
          color: product.color || product.presentacion,
          presentacion: product.presentacion,
          precioMayorUsd: product.precioMayorUsd,
          minMayor: product.minMayor || 50,
          precioGranMayorUsd: product.precioGranMayorUsd,
          minGranMayor: product.minGranMayor || 100,
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
  const minMayor = activeVariant.minMayor || 50;
  const minGranMayor = activeVariant.minGranMayor || 100;
  const priceMayor = activeVariant.precioMayorUsd ?? 0;
  const priceGranMayor = activeVariant.precioGranMayorUsd ?? 0;

  // Selección de Tarifa: "mayor" | "gran_mayor"
  const [selectedTier, setSelectedTier] = useState<"mayor" | "gran_mayor">("mayor");

  // Multiplicador de paquetes / lotes (1, 2, 3...)
  const [packCount, setPackCount] = useState<number>(1);
  const [comentarios, setComentarios] = useState<string>("");
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);
  const [stockAlertMessage, setStockAlertMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Unidades totales resultantes
  const unitsPerPack = selectedTier === "gran_mayor" ? minGranMayor : minMayor;
  const pricePerPack = selectedTier === "gran_mayor" ? priceGranMayor : priceMayor;
  const totalUnits = packCount * unitsPerPack;

  const totalUsd = Math.round(pricePerPack * packCount * 100) / 100;

  const maxStock = activeVariant.stock > 0 ? activeVariant.stock : 500;
  const maxPacks = Math.max(1, Math.floor(maxStock / unitsPerPack));

  const handleAddToCart = () => {
    if (!activeVariant.isAvailable) return;
    
    // Si intenta agregar más del stock disponible
    if (activeVariant.stock > 0 && totalUnits > activeVariant.stock) {
      setStockAlertMessage(`Solo quedan ${activeVariant.stock} unidades disponibles de este producto.`);
      setTimeout(() => setStockAlertMessage(null), 4000);
      return;
    }

    // Guarda en el carrito con su SKU único de variante (así ROJA y DORADA se guardan como productos separados)
    updateQuantity(activeVariant.sku, totalUnits, selectedTier, comentarios);
    setAddedFeedback(true);
    setStockAlertMessage(null);
    setTimeout(() => setAddedFeedback(false), 2500);
  };

  const handleIncrement = () => {
    let nextPackCount = packCount + 1;
    let nextTotalUnits = nextPackCount * unitsPerPack;

    // Si excede el stock
    if (activeVariant.stock > 0 && nextTotalUnits > activeVariant.stock) {
      setStockAlertMessage(`Solo quedan ${activeVariant.stock} unidades disponibles de este producto.`);
      setTimeout(() => setStockAlertMessage(null), 4000);
      return;
    }

    // Si está en MAYOR y llega a la cantidad de GRAN MAYOR, auto-cambiar
    if (selectedTier === "mayor" && priceGranMayor > 0 && minGranMayor > 0 && nextTotalUnits >= minGranMayor) {
      setSelectedTier("gran_mayor");
      setPackCount(Math.floor(nextTotalUnits / minGranMayor));
      setStockAlertMessage(null);
      return;
    }

    setPackCount(nextPackCount);
    setStockAlertMessage(null);
  };

  const handleDecrement = () => {
    if (packCount <= 1) {
      // Si está en Gran Mayor y presiona menos, bajar a Mayor
      if (selectedTier === "gran_mayor") {
        setSelectedTier("mayor");
        const fallbackUnits = Math.max(minMayor, minGranMayor - minMayor);
        setPackCount(Math.floor(fallbackUnits / minMayor));
      }
      return;
    }
    setPackCount((prev) => prev - 1);
    setStockAlertMessage(null);
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

  const whatsappNum = theme.whatsappNumber || "584227894547";
  const whatsappInquiryUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar sobre el producto: ${product.nombre} (Color: ${activeVariant.color}, SKU: ${activeVariant.sku}, Modalidad: ${selectedTier === "gran_mayor" ? "Gran Mayor" : "Mayor"} de ${totalUnits} unds)`
  )}`;

  return (
    <div className="flex flex-col gap-6 bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs max-w-4xl mx-auto">
      {/* 1. TÍTULO Y SKU ARRIBA DE LA IMAGEN (Sin stock disponible visible) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
          {product.nombre}
        </h1>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
          <span>SKU: <strong className="text-slate-700">{activeVariant.sku}</strong></span>
          {!activeVariant.isAvailable && (
            <>
              <span>·</span>
              <span className="text-rose-600 font-semibold">Agotado temporalmente</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Galería de imágenes (hasta 10 fotos) */}
      <ProductGallery
        photos={activeVariant.fotos && activeVariant.fotos.length > 0 ? activeVariant.fotos : product.fotos}
        productName={product.nombre}
        status={activeVariant.status}
      />

      {/* 3. Selector de Color */}
      {variants.length > 1 && (
        <div className="pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-brand" />
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
                    setStockAlertMessage(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border touch-target ${
                    isSelected
                      ? "bg-brand text-white border-brand shadow-sm scale-105"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? "bg-white" : "bg-brand"}`}></span>
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

      {/* 4. DESCRIPCIÓN DEL PRODUCTO (Ubicada justo después de la variación de color) */}
      {product.descripcionLarga && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Descripción del Producto
          </h2>
          <p className="whitespace-pre-line text-xs sm:text-sm text-slate-600">{product.descripcionLarga}</p>
        </div>
      )}

      {/* 5. Selector de Modalidad: MAYOR y GRAN MAYOR (Paleta vinotinto #590317, sin US) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
        {/* Opción MAYOR */}
        <label
          onClick={() => {
            setSelectedTier("mayor");
            setPackCount(1);
            setStockAlertMessage(null);
          }}
          className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
            selectedTier === "mayor" ? "bg-rose-50/60" : "hover:bg-slate-50"
          }`}
        >
          <div>
            <div className="text-sm font-black text-slate-900 uppercase">
              MAYOR: {minMayor} unds
            </div>
            <div className="text-base font-bold text-brand mt-0.5">
              $ {priceMayor.toFixed(2).replace(".", ",")}
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
                setStockAlertMessage(null);
              }}
              className="w-5 h-5 text-brand focus:ring-brand cursor-pointer accent-brand"
            />
          </div>
        </label>

        {/* Opción GRAN MAYOR (si está configurada) */}
        {priceGranMayor > 0 && minGranMayor > 0 && (
          <label
            onClick={() => {
              setSelectedTier("gran_mayor");
              setPackCount(1);
              setStockAlertMessage(null);
            }}
            className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
              selectedTier === "gran_mayor" ? "bg-rose-50/60" : "hover:bg-slate-50"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 uppercase">
                  GRAN MAYOR: {minGranMayor} unds
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  Ahorro por volumen
                </span>
              </div>
              <div className="text-base font-bold text-brand mt-0.5">
                $ {priceGranMayor.toFixed(2).replace(".", ",")}
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
                  setStockAlertMessage(null);
                }}
                className="w-5 h-5 text-brand focus:ring-brand cursor-pointer accent-brand"
              />
            </div>
          </label>
        )}
      </div>

      {/* 6. Comentarios (Opcional) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Comentarios
        </label>
        <input
          type="text"
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          placeholder="(Opcional)"
          className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
        />
      </div>

      {/* Mensaje de alerta de stock si el usuario intenta exceder */}
      {stockAlertMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-shake">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{stockAlertMessage}</span>
        </div>
      )}

      {/* 7. Barra de Acción Inferior: Contador [ - 1 + ] y Botón Vinotinto [ Agregar $ XX,XX ] */}
      <div className="pt-2">
        {activeVariant.isAvailable ? (
          <div className="flex items-center gap-3">
            {/* Contador de paquetes/lotes */}
            <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={packCount <= 1 && selectedTier !== "gran_mayor"}
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
                onClick={handleIncrement}
                disabled={packCount >= maxPacks}
                aria-label="Aumentar lote"
                className="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-brand disabled:opacity-30 hover:bg-slate-200 transition-colors shadow-xs touch-target font-bold text-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Botón Principal de Agregar con Paleta Vinotinto de Sumilisto */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 h-13 px-6 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.99] transition-all touch-target ${
                addedFeedback
                  ? "bg-emerald-600 text-white"
                  : "bg-brand hover:bg-brand-hover active:bg-brand-active text-white"
              }`}
            >
              {addedFeedback ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>¡Agregado al Pedido! ({totalUnits} unds)</span>
                </>
              ) : (
                <>
                  <span>Agregar $ {totalUsd.toFixed(2).replace(".", ",")}</span>
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
      </div>

      {/* 8. Botón secundario y garantías */}
      <div className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
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
