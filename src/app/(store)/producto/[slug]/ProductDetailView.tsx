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
  Play,
  Video,
} from "lucide-react";

// ──── Galería multimedia (hasta 10 fotos y 1 video) ────
interface GalleryProps {
  photos: { url: string; alt?: string; varianteColor?: string }[];
  videoUrl?: string;
  activeIdx: number;
  onSelectIndex: (idx: number) => void;
  productName: string;
  status: import("@/types/product").ProductStockStatus;
}

type MediaItem =
  | { type: "photo"; url: string; alt: string; varianteColor?: string }
  | { type: "video"; url: string; alt: string; varianteColor?: string };

function ProductGallery({
  photos,
  videoUrl,
  activeIdx,
  onSelectIndex,
  productName,
  status,
}: GalleryProps) {
  // Lista unificada de items multimedia: hasta 10 fotos y 1 video
  const mediaItems: MediaItem[] = React.useMemo(() => {
    const safePhotos = (photos || []).slice(0, 10);
    const items: MediaItem[] = safePhotos.map((p) => ({
      type: "photo",
      url: p.url,
      alt: p.alt || productName,
      varianteColor: p.varianteColor,
    }));
    if (videoUrl) {
      items.push({
        type: "video",
        url: videoUrl,
        alt: `Video demostración de ${productName}`,
      });
    }
    if (items.length === 0) {
      items.push({
        type: "photo",
        url: "https://placehold.co/600x600/f1f5f9/94a3b8?text=Sin+Foto",
        alt: productName,
      });
    }
    return items;
  }, [photos, videoUrl, productName]);

  const safeIdx = Math.max(0, Math.min(activeIdx, mediaItems.length - 1));
  const activeItem = mediaItems[safeIdx] || mediaItems[0];

  // Soporte táctil / swipe para dispositivos móviles
  const touchStartX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    touchStartX.current = null;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Deslizar izquierda -> siguiente
        onSelectIndex(safeIdx < mediaItems.length - 1 ? safeIdx + 1 : 0);
      } else {
        // Deslizar derecha -> anterior
        onSelectIndex(safeIdx > 0 ? safeIdx - 1 : mediaItems.length - 1);
      }
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* Visor Principal */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center select-none"
      >
        {activeItem.type === "photo" ? (
          <Image
            src={activeItem.url}
            alt={activeItem.alt}
            fill
            priority={safeIdx === 0}
            unoptimized={true}
            sizes="(max-width: 768px) 100vw, 512px"
            className="object-contain object-center"
          />
        ) : (
          <video
            src={activeItem.url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain bg-black"
          />
        )}

        {/* Badge de disponibilidad: Solo si está AGOTADO para no restar visualización de la foto */}
        {(status === "agotado" || status === "no_disponible") && (
          <div className="absolute top-3 left-3 z-10">
            <Badge status={status} />
          </div>
        )}

        {/* Contador / Indicador de tipo y variante */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
            {activeItem.type === "video" ? (
              <>
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <span>Video</span>
              </>
            ) : (
              <span>
                {activeItem.varianteColor ? `${activeItem.varianteColor} · ` : ""}
                {safeIdx + 1} / {mediaItems.length}
              </span>
            )}
          </div>
        )}

        {/* Flechas de navegación */}
        {mediaItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onSelectIndex(safeIdx > 0 ? safeIdx - 1 : mediaItems.length - 1)}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-xs shadow-md transition-all active:scale-90 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onSelectIndex(safeIdx < mediaItems.length - 1 ? safeIdx + 1 : 0)}
              aria-label="Siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-xs shadow-md transition-all active:scale-90 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Miniaturas de fotos y video */}
      {mediaItems.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-1 px-1 justify-start sm:justify-center scrollbar-thin">
          {mediaItems.map((item, idx) => {
            const isSelected = idx === safeIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectIndex(idx)}
                aria-label={`Ver item ${idx + 1}`}
                className={`relative flex-shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-brand shadow-md scale-105 ring-2 ring-brand/20 opacity-100"
                    : "border-slate-200 opacity-60 hover:opacity-100 bg-slate-100"
                }`}
              >
                {item.type === "photo" ? (
                  <>
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {item.varianteColor && (
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[8px] font-black uppercase tracking-wider text-center py-0.5 truncate">
                        {item.varianteColor}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-white">
                    <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center mb-0.5 shadow-xs">
                      <Play className="w-3.5 h-3.5 text-white ml-0.5 fill-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-white">Video</span>
                  </div>
                )}
              </button>
            );
          })}
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

  // Índice de foto/video activa en la galería
  const [activeMediaIdx, setActiveMediaIdx] = useState<number>(() => {
    const initialVariant = variants.find((v) => v.isAvailable) || variants[0];
    if (initialVariant?.color && product.fotos && product.fotos.length > 0) {
      const matchIdx = product.fotos.findIndex(
        (f) => f.varianteColor?.trim().toLowerCase() === initialVariant.color?.trim().toLowerCase()
      );
      if (matchIdx >= 0) return matchIdx;
    }
    return 0;
  });

  // Manejar selección de variante por botón
  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedSku(variant.sku);
    setPackCount(1);
    setStockAlertMessage(null);

    // Si la variante tiene una foto asignada, saltar a ella en el carrusel
    if (variant.color && product.fotos && product.fotos.length > 0) {
      const matchIdx = product.fotos.findIndex(
        (f) => f.varianteColor?.trim().toLowerCase() === variant.color?.trim().toLowerCase()
      );
      if (matchIdx >= 0) {
        setActiveMediaIdx(matchIdx);
      }
    }
  };

  // Manejar selección de foto/video desde miniaturas o flechas del carrusel
  const handleSelectMedia = (idx: number) => {
    setActiveMediaIdx(idx);

    // Si la foto seleccionada tiene una variante de color asociada, sincronizar también la variante
    const photo = product.fotos?.[idx];
    if (photo?.varianteColor) {
      const matchingVariant = variants.find(
        (v) => v.color?.trim().toLowerCase() === photo.varianteColor?.trim().toLowerCase()
      );
      if (matchingVariant && matchingVariant.sku !== selectedSku) {
        setSelectedSku(matchingVariant.sku);
        setPackCount(1);
        setStockAlertMessage(null);
      }
    }
  };

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

  const whatsappNum = theme.whatsappNumber || "584227864547";
  const whatsappInquiryUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar sobre el producto: ${product.nombre} (Color: ${activeVariant.color}, SKU: ${activeVariant.sku}, Modalidad: ${selectedTier === "gran_mayor" ? "Gran Mayor" : "Mayor"} de ${totalUnits} unds)`
  )}`;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        
        {/* Título y SKU - Primero en móvil */}
        <div className="flex flex-col gap-1 md:hidden">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {product.nombre}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span>SKU: <strong className="text-slate-700">{activeVariant.sku}</strong></span>
            {!activeVariant.isAvailable && (
              <>
                <span>·</span>
                <span className="text-rose-600 font-semibold">Agotado temporalmente</span>
              </>
            )}
          </div>
        </div>

        {/* Columna Izquierda: Galería */}
        <div className="flex flex-col gap-4">
          <ProductGallery
            photos={product.fotos}
            videoUrl={product.videoUrl}
            activeIdx={activeMediaIdx}
            onSelectIndex={handleSelectMedia}
            productName={product.nombre}
            status={activeVariant.status}
          />
        </div>

        {/* Columna Derecha: Título (solo desktop), precio, botones */}
        <div className="flex flex-col gap-6">
          {/* Título y SKU - Solo visible en desktop */}
          <div className="hidden md:block">
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

          {/* Selector de Color */}
          {variants.length > 1 && (
            <div className="pt-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-brand" />
                <span>SELECCIONA LA VARIANTE ({variants.length} disponibles):</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((v) => {
                  const isSelected = v.sku === selectedSku;
                  return (
                    <button
                      key={v.sku}
                      type="button"
                      onClick={() => handleSelectVariant(v)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border touch-target cursor-pointer ${
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

          {/* Descripción */}
          {product.descripcionLarga && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Descripción del Producto
              </h2>
              <p className="whitespace-pre-line text-xs sm:text-sm text-slate-600">{product.descripcionLarga}</p>
            </div>
          )}

          {/* Selector de Modalidad */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
            {/* Opción MAYOR */}
            <label
              onClick={() => {
                setSelectedTier("mayor");
                setPackCount(1);
                setStockAlertMessage(null);
              }}
              style={{
                backgroundColor: selectedTier === "mayor" ? (theme.softBgColor || "#f0fdf4") : undefined,
              }}
              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                selectedTier !== "mayor" ? "hover:bg-slate-50" : ""
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

            {/* Opción GRAN MAYOR */}
            {priceGranMayor > 0 && minGranMayor > 0 && (
              <label
                onClick={() => {
                  setSelectedTier("gran_mayor");
                  setPackCount(1);
                  setStockAlertMessage(null);
                }}
                style={{
                  backgroundColor: selectedTier === "gran_mayor" ? (theme.softBgColor || "#f0fdf4") : undefined,
                }}
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  selectedTier !== "gran_mayor" ? "hover:bg-slate-50" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 uppercase">
                      GRAN MAYOR: {minGranMayor} unds
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                      Ahorro
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

          {/* Comentarios */}
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

          {stockAlertMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-shake">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{stockAlertMessage}</span>
            </div>
          )}

          {/* Controles Agregar al Carrito */}
          <div className="pt-2">
            {activeVariant.isAvailable ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={packCount <= 1 && selectedTier !== "gran_mayor"}
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
                    className="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-brand disabled:opacity-30 hover:bg-slate-200 transition-colors shadow-xs touch-target font-bold text-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 h-13 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.99] transition-all touch-target ${
                    addedFeedback
                      ? "bg-emerald-600 text-white"
                      : "bg-brand hover:bg-brand-hover active:bg-brand-active text-white"
                  }`}
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>¡Agregado!</span>
                    </>
                  ) : (
                    <>
                      <span>Agregar $ {totalUsd.toFixed(2).replace(".", ",")}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-13 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-sm transition-colors touch-target"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Consultar por WhatsApp</span>
              </a>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100 mt-2">
            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-700 hover:underline font-semibold"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Consultar asesor</span>
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
      </div>
    </div>
  );
};
