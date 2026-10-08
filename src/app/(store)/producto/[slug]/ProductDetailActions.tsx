"use client";

import React, { useState } from "react";
import { Product } from "@/types/product";
import { useCart } from "@/lib/cart/CartContext";
import { Plus, Minus, ShoppingBag, MessageCircle, Share2, Check } from "lucide-react";

interface ProductDetailActionsProps {
  product: Product;
  whatsappUrl: string;
}

export const ProductDetailActions: React.FC<ProductDetailActionsProps> = ({
  product,
  whatsappUrl,
}) => {
  const { getItemQuantity, updateQuantity, addItem } = useCart();
  const currentQuantity = getItemQuantity(product.sku);
  const [selectedQty, setSelectedQty] = useState(
    currentQuantity > 0 ? currentQuantity : (product.minMayor || 1)
  );
  const [copied, setCopied] = useState(false);

  const handleAddToCart = () => {
    if (!product.isAvailable) return;
    updateQuantity(product.sku, selectedQty);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${product.nombre} al Mayor | Sumilisto`,
          text: `Mira este suministro para restaurantes en Sumilisto: ${product.nombre}`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback a clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!product.isAvailable) {
    return (
      <div className="flex flex-col gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base shadow-sm transition-colors touch-target"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Consultar disponibilidad por WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleShare}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors touch-target"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? "Enlace copiado al portapapeles" : "Compartir producto"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de Cantidad */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => setSelectedQty((prev) => Math.max(product.minMayor || 1, prev - 1))}
            disabled={selectedQty <= (product.minMayor || 1)}
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

        {/* Botón de Agregar al Pedido */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-hover active:bg-brand-active text-white font-bold text-sm sm:text-base shadow-sm transition-all touch-target"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>{currentQuantity > 0 ? "Actualizar pedido" : "Agregar al pedido"}</span>
        </button>
      </div>

      {/* Botones Secundarios: WhatsApp y Compartir */}
      <div className="flex items-center gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs sm:text-sm border border-emerald-200 transition-colors touch-target"
        >
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>Consultar dudas de este producto</span>
        </a>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Compartir este producto"
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors touch-target border border-slate-200"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
