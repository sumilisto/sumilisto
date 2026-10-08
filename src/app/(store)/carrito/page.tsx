"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart/CartContext";
import { useProducts } from "@/lib/products/ProductsContext";
import { calculateProductPrice } from "@/lib/pricing/pricing";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { CustomerOrderForm } from "@/types/cart";
import {
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  ArrowLeft,
  Truck,
  Building,
  CreditCard,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function CartPage() {
  const {
    items,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    status,
    hoursRemaining,
    markAsSentWhatsApp,
  } = useCart();

  const { products, bcvRate } = useProducts();

  // Formulario del cliente
  const [formData, setFormData] = useState<CustomerOrderForm>({
    nombre: "",
    modalidad: "entrega",
    zonaEntrega: "Caracas",
    metodoPago: "Pago Móvil / Transferencia",
    notas: "",
  });

  // Calcular líneas de pedido y totales con el motor de precios
  const cartLines = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((p) => p.sku === item.sku);
        if (!product) return null;
        const pricing = calculateProductPrice(product, item.cantidad);
        const subtotalVes = calculateVesTotal(pricing.subtotalUsd, bcvRate);

        return {
          product,
          quantity: item.cantidad,
          pricing,
          subtotalVes,
        };
      })
      .filter(Boolean);
  }, [items, products, bcvRate]);

  const totalUsd = useMemo(() => {
    return cartLines.reduce((acc, line) => acc + (line?.pricing.subtotalUsd || 0), 0);
  }, [cartLines]);

  const totalVes = useMemo(() => {
    return calculateVesTotal(totalUsd, bcvRate);
  }, [totalUsd, bcvRate]);

  // Generación de código corto de pedido: SUM-AAMMDD-XXXX
  const orderCode = useMemo(() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `SUM-${yy}${mm}${dd}-${rand}`;
  }, []);

  // Construcción del mensaje estructurado para WhatsApp
  const whatsappUrl = useMemo(() => {
    if (cartLines.length === 0) return "";

    let linesText = "";
    cartLines.forEach((line, index) => {
      if (!line) return;
      const { product, quantity, pricing } = line;
      linesText += `${index + 1}. *${quantity} Unidades × ${product.nombre}* (${product.presentacion})\n   Tarifa: ${pricing.tier === "gran_mayor" ? "Gran Mayor" : "Mayor"} · Total = *${formatUsd(pricing.subtotalUsd)}*\n`;
    });

    const message = `👋 *NUEVO PEDIDO DE SUMINISTROS — SUMILISTO*
Código: *${orderCode}*
----------------------------------------
📋 *DETALLE DEL PEDIDO:*
${linesText}
----------------------------------------
💵 *TOTAL A PAGAR:*
• *${formatUsd(totalUsd)}*
• *${formatVes(totalVes)}* (Ref. Tasa BCV: ${formatVes(bcvRate)})
----------------------------------------
📍 *DATOS DE DESPACHO:*
• *Cliente:* ${formData.nombre || "Por confirmar"}
• *Modalidad:* ${formData.modalidad === "entrega" ? "Entrega a domicilio" : "Retiro en almacén"}
• *Zona:* ${formData.zonaEntrega}
• *Método de pago:* ${formData.metodoPago}
${formData.notas ? `• *Notas:* ${formData.notas}\n` : ""}
_Disponibilidad y precios sujetos a confirmación por el asesor comercial._
🔗 Tienda: https://sumilisto.com`;

    return `https://wa.me/584227894547?text=${encodeURIComponent(message)}`;
  }, [cartLines, totalUsd, totalVes, bcvRate, orderCode, formData]);

  const handleSendOrder = () => {
    markAsSentWhatsApp();
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 flex items-center justify-center text-[#590317] mb-4">
          <Truck className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tu pedido está vacío</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Explora nuestro catálogo mayorista de envases, bolsas, cubiertos y papel para tu restaurante o negocio.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 h-12 px-6 rounded-xl bg-[#590317] text-white font-bold text-sm shadow-md hover:bg-[#73041e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explorar el catálogo</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Aviso de persistencia de 48h */}
      {status === "enviado_whatsapp" ? (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              Tienes un pedido previamente enviado a WhatsApp. Vigencia restante: <strong>{hoursRemaining} horas</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-emerald-800 font-bold hover:underline ml-2 flex-shrink-0"
          >
            Vaciar pedido
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 text-slate-700 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Tu pedido se guarda automáticamente durante 48 horas en este navegador.</span>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-slate-500 hover:text-rose-700 font-semibold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vaciar</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Izquierda: Lista de productos en el pedido */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Resumen del Pedido ({itemCount} {itemCount === 1 ? "artículo" : "artículos"})
            </h1>
            <Link
              href="/"
              className="text-xs font-bold text-[#590317] hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Seguir agregando</span>
            </Link>
          </div>

          <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-4">
            {cartLines.map((line) => {
              if (!line) return null;
              const { product, quantity, pricing, subtotalVes } = line;

              return (
                <div key={product.sku} className="py-4 first:pt-2 last:pb-2 flex gap-3 sm:gap-4 items-center">
                  {/* Foto miniatura */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                    <Image
                      src={product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=200&q=80"}
                      alt={product.nombre}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  {/* Info y precios */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {product.sku}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.2 rounded text-[10px] font-bold bg-[#fdf2f4] text-[#590317]">
                        {pricing.tier === "gran_mayor" ? "Gran Mayor" : "Mayor"}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {product.nombre}
                    </h3>
                    <div className="text-xs text-slate-500">
                      {product.presentacion} · {formatUsd(pricing.unitPriceUsd)} c/u
                    </div>

                    {/* Aviso de ahorro al siguiente nivel si aplica */}
                    {pricing.savingsNextTier && (
                      <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium inline-block">
                        {pricing.savingsNextTier.message}
                      </div>
                    )}
                  </div>

                  {/* Selector y Subtotal */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-black text-sm sm:text-base text-slate-900">
                        {formatUsd(pricing.subtotalUsd)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatVes(subtotalVes)}
                      </div>
                    </div>

                    <div className="flex items-center rounded-lg bg-slate-100 border border-slate-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const step = product.minMayor || 1;
                          if (quantity <= step) {
                            removeItem(product.sku);
                          } else {
                            updateQuantity(product.sku, quantity - step);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 text-xs shadow-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-center text-xs font-bold text-slate-900 min-w-[3.5rem]">
                        {quantity} <span className="text-[10px] font-normal text-slate-500">Unid.</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const step = product.minMayor || 1;
                          updateQuantity(product.sku, quantity + step);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 text-xs shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(product.sku)}
                      className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Formulario de Despacho y Checkout WhatsApp */}
        <div className="flex flex-col gap-4 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
            Datos de Entrega y Pedido
          </h2>

          <div className="flex flex-col gap-3.5 text-xs sm:text-sm">
            {/* Nombre del Negocio / Comprador */}
            <div>
              <label htmlFor="customer-name" className="block font-bold text-slate-700 mb-1">
                Tu Nombre o Nombre de tu Restaurante *
              </label>
              <input
                id="customer-name"
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. Restaurante La Casona / Carlos Pérez"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#590317] text-slate-900"
              />
            </div>

            {/* Modalidad: Entrega vs Retiro */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Modalidad de Recepción *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, modalidad: "entrega" })}
                  className={`h-10 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    formData.modalidad === "entrega"
                      ? "bg-[#590317] text-white border-[#590317]"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Entrega</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, modalidad: "retiro" })}
                  className={`h-10 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    formData.modalidad === "retiro"
                      ? "bg-[#590317] text-white border-[#590317]"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Retiro</span>
                </button>
              </div>
            </div>

            {/* Zona de Entrega */}
            <div>
              <label htmlFor="delivery-zone" className="block font-bold text-slate-700 mb-1">
                Zona de Entrega *
              </label>
              <select
                id="delivery-zone"
                value={formData.zonaEntrega}
                onChange={(e) => setFormData({ ...formData, zonaEntrega: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#590317] text-slate-900 bg-white"
              >
                <option value="Caracas">Caracas (Área Metropolitana)</option>
                <option value="Guarenas">Guarenas</option>
                <option value="Guatire">Guatire</option>
                <option value="Nacional">Envío Nacional por Encomienda</option>
              </select>
            </div>

            {/* Método de Pago */}
            <div>
              <label htmlFor="payment-method" className="block font-bold text-slate-700 mb-1">
                Método de Pago Preferido *
              </label>
              <select
                id="payment-method"
                value={formData.metodoPago}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#590317] text-slate-900 bg-white"
              >
                <option value="Pago Móvil / Transferencia">Pago Móvil / Transferencia Bancaria (Bs.)</option>
                <option value="Efectivo USD">Dólares en Efectivo (Contra entrega)</option>
                <option value="Binance USDT">Binance Pay (USDT)</option>
                <option value="Zelle">Zelle</option>
              </select>
            </div>

            {/* Notas opcionales */}
            <div>
              <label htmlFor="order-notes" className="block font-bold text-slate-700 mb-1">
                Notas o Instrucciones Especiales
              </label>
              <textarea
                id="order-notes"
                rows={2}
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Punto de referencia, horario preferido de recepción..."
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#590317] text-slate-900 text-xs resize-none"
              />
            </div>
          </div>

          {/* Desglose de Totales */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal estimado:</span>
              <span className="font-semibold text-slate-900">{formatUsd(totalUsd)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Tasa oficial BCV:</span>
              <span className="font-semibold text-slate-900">{formatVes(bcvRate)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-base font-black text-slate-900">Total a Pagar:</span>
              <div className="text-right">
                <div className="text-2xl font-black text-[#590317]">{formatUsd(totalUsd)}</div>
                <div className="text-xs font-bold text-slate-500">{formatVes(totalVes)}</div>
              </div>
            </div>
          </div>

          {/* Botón Principal: Checkout WhatsApp */}
          <div className="mt-2 flex flex-col gap-2">
            <a
              href={whatsappUrl}
              onClick={handleSendOrder}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] text-white font-black text-base shadow-lg transition-transform active:scale-[0.98] touch-target"
            >
              <MessageCircle className="w-6 h-6" />
              <span>Enviar Pedido por WhatsApp</span>
            </a>

            <p className="text-[11px] text-center text-slate-500 leading-tight">
              Al hacer clic se abrirá una conversación en WhatsApp con tu pedido desglosado para acordar entrega y confirmación de existencias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
