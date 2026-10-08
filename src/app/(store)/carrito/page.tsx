"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart/CartContext";
import { useProducts } from "@/lib/products/ProductsContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { CustomerOrderForm } from "@/types/cart";
import { Product, ProductVariant } from "@/types/product";
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
  const { theme } = useTheme();

  // Formulario del cliente
  const [formData, setFormData] = useState<CustomerOrderForm>({
    nombre: "",
    modalidad: "entrega",
    zonaEntrega: "Caracas",
    metodoPago: "Pago Móvil / Transferencia",
    notas: "",
  });

  // Calcular líneas de pedido y totales buscando el producto y su variante exacta
  const cartLines = useMemo(() => {
    return items
      .map((item) => {
        let foundProduct: Product | undefined;
        let foundVariant: ProductVariant | undefined;

        for (const p of products) {
          if (p.sku === item.sku) {
            foundProduct = p;
            foundVariant = p.variantes?.find((v) => v.sku === item.sku) || undefined;
            break;
          }
          const v = p.variantes?.find((v) => v.sku === item.sku);
          if (v) {
            foundProduct = p;
            foundVariant = v;
            break;
          }
        }

        if (!foundProduct) return null;

        const effectiveVariant: ProductVariant = foundVariant || {
          sku: foundProduct.sku,
          color: foundProduct.color || foundProduct.presentacion,
          presentacion: foundProduct.presentacion,
          precioMayorUsd: foundProduct.precioMayorUsd,
          minMayor: foundProduct.minMayor || 50,
          precioGranMayorUsd: foundProduct.precioGranMayorUsd,
          minGranMayor: foundProduct.minGranMayor || 100,
          stock: foundProduct.stock,
          status: foundProduct.status,
          isAvailable: foundProduct.isAvailable,
          fotos: foundProduct.fotos,
        };

        const minMayor = effectiveVariant.minMayor || 50;
        const minGranMayor = effectiveVariant.minGranMayor || 100;
        const priceMayor = effectiveVariant.precioMayorUsd || 0;
        const priceGranMayor = effectiveVariant.precioGranMayorUsd || 0;

        // Tarifa aplicada: Gran Mayor si se eligió o si la cantidad alcanza minGranMayor
        const isGranMayor =
          item.tier === "gran_mayor" ||
          (priceGranMayor > 0 && minGranMayor > 0 && item.cantidad >= minGranMayor);

        let subtotalUsd = 0;
        let unitPriceUsd = priceMayor;
        let tier: "mayor" | "gran_mayor" = "mayor";
        let step = minMayor;

        if (isGranMayor && priceGranMayor > 0 && minGranMayor > 0) {
          tier = "gran_mayor";
          unitPriceUsd = priceGranMayor;
          step = minGranMayor;
          const factor = item.cantidad / minGranMayor;
          subtotalUsd = Math.round(priceGranMayor * factor * 100) / 100;
        } else {
          tier = "mayor";
          unitPriceUsd = priceMayor;
          step = minMayor;
          const factor = item.cantidad / minMayor;
          subtotalUsd = Math.round(priceMayor * factor * 100) / 100;
        }

        const subtotalVes = calculateVesTotal(subtotalUsd, bcvRate);

        return {
          product: foundProduct,
          variant: effectiveVariant,
          sku: item.sku,
          quantity: item.cantidad,
          tier,
          step,
          minMayor,
          minGranMayor,
          unitPriceUsd,
          subtotalUsd,
          subtotalVes,
          comentarios: item.comentarios,
        };
      })
      .filter(Boolean);
  }, [items, products, bcvRate]);

  const totalUsd = useMemo(() => {
    return cartLines.reduce((acc, line) => acc + (line?.subtotalUsd || 0), 0);
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
      const { product, variant, quantity, tier, subtotalUsd, comentarios } = line;
      linesText += `${index + 1}. *${quantity} Unidades × ${product.nombre}* (Color: ${variant.color || "Estándar"})\n   Tarifa: *${tier === "gran_mayor" ? "Gran Mayor" : "Mayor"}* · Subtotal = *${formatUsd(subtotalUsd)}*${comentarios ? `\n   Nota: ${comentarios}` : ""}\n`;
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
${formData.notas ? `• *Notas adicionales:* ${formData.notas}\n` : ""}
_Disponibilidad y precios sujetos a confirmación por el asesor comercial._
🔗 Tienda: https://sumilisto.com`;

    return `https://wa.me/${theme.whatsappNumber || "584227894547"}?text=${encodeURIComponent(message)}`;
  }, [cartLines, totalUsd, totalVes, bcvRate, orderCode, formData, theme.whatsappNumber]);

  const handleSendOrder = () => {
    markAsSentWhatsApp();
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 flex items-center justify-center text-brand mb-4">
          <Truck className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tu pedido está vacío</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Explora nuestro catálogo mayorista de envases, bolsas, cubiertos y papel para tu restaurante o negocio.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 h-12 px-6 rounded-xl bg-brand text-white font-bold text-sm shadow-md hover:bg-brand-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explorar el catálogo</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Resumen de tu Pedido Mayorista
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {itemCount} {itemCount === 1 ? "producto seleccionado" : "productos seleccionados"} · Código: <strong className="text-slate-800">{orderCode}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar pedido</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Lista de productos en pedido */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Artículos en el pedido
            </h2>
            <Link
              href="/"
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Seguir agregando</span>
            </Link>
          </div>

          <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-4">
            {cartLines.map((line) => {
              if (!line) return null;
              const { product, variant, sku, quantity, tier, step, minMayor, minGranMayor, subtotalUsd, subtotalVes, comentarios } = line;

              return (
                <div key={sku} className="py-4 first:pt-2 last:pb-2 flex gap-3 sm:gap-4 items-center">
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
                        {sku}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        tier === "gran_mayor" ? "bg-amber-100 text-amber-900" : "bg-rose-50 text-brand"
                      }`}>
                        {tier === "gran_mayor" ? "Gran Mayor" : "Mayor"}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {product.nombre}
                    </h3>
                    <div className="text-xs text-slate-600 font-medium">
                      Color: <strong>{variant.color || "Estándar"}</strong>
                    </div>

                    {comentarios && (
                      <div className="text-[11px] text-slate-500 italic mt-0.5">
                        Nota: {comentarios}
                      </div>
                    )}
                  </div>

                  {/* Selector y Subtotal */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-black text-sm sm:text-base text-slate-900">
                        {formatUsd(subtotalUsd)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatVes(subtotalVes)}
                      </div>
                    </div>

                    <div className="flex items-center rounded-lg bg-slate-100 border border-slate-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (tier === "gran_mayor" && quantity === minGranMayor) {
                            // Step down to Mayor tier
                            const nextQuantity = Math.max(minMayor, minGranMayor - minMayor);
                            updateQuantity(sku, nextQuantity, "mayor");
                          } else if (quantity <= minMayor) {
                            removeItem(sku);
                          } else {
                            updateQuantity(sku, quantity - step, tier);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 text-xs shadow-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-center text-xs font-bold text-slate-900 min-w-[3.5rem]">
                        {quantity} <span className="text-[10px] font-normal text-slate-500">unds</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextQuantity = quantity + step;
                          const nextTier = nextQuantity >= minGranMayor ? "gran_mayor" : "mayor";
                          updateQuantity(sku, nextQuantity, nextTier);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white text-brand hover:bg-slate-200 text-xs shadow-xs font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(sku)}
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

        {/* Columna Derecha: Formulario y Totales */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Tarjeta de Datos de Entrega */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand" />
              <span>Datos para el Despacho</span>
            </h2>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre o Empresa / Restaurante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Hamburguesería Caracas / Juan Pérez"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, modalidad: "entrega" })}
                  className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    formData.modalidad === "entrega"
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Entrega a domicilio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, modalidad: "retiro" })}
                  className={`h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    formData.modalidad === "retiro"
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Retiro en almacén</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Zona de Entrega / Municipio *
                </label>
                <select
                  value={formData.zonaEntrega}
                  onChange={(e) => setFormData({ ...formData, zonaEntrega: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                >
                  <option value="Caracas - Libertador">Caracas - Municipio Libertador</option>
                  <option value="Caracas - Chacao">Caracas - Municipio Chacao</option>
                  <option value="Caracas - Baruta">Caracas - Municipio Baruta</option>
                  <option value="Caracas - Sucre">Caracas - Municipio Sucre</option>
                  <option value="Caracas - El Hatillo">Caracas - Municipio El Hatillo</option>
                  <option value="Guarenas">Guarenas</option>
                  <option value="Guatire">Guatire</option>
                  <option value="Envíos Nacionales">Envíos Nacionales (Encomienda)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Método de Pago Estimado
                </label>
                <select
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                >
                  <option value="Pago Móvil / Transferencia Bs (Tasa BCV)">Pago Móvil / Transferencia Bs (Tasa BCV)</option>
                  <option value="Dólares en Efectivo (Contra entrega)">Dólares en Efectivo (Contra entrega)</option>
                  <option value="Zelle / Binance USDT">Zelle / Binance USDT</option>
                  <option value="Transferencia Banesco Panamá">Transferencia Banesco Panamá</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resumen Total y Botón WhatsApp */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total en Dólares:</span>
              <span className="text-2xl sm:text-3xl font-black text-white">{formatUsd(totalUsd)}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Ref. Bolívares (BCV):</span>
              <div className="text-right">
                <span className="text-lg font-bold text-emerald-400">{formatVes(totalVes)}</span>
                <div className="text-[10px] text-slate-400">Tasa oficial: {formatVes(bcvRate)}</div>
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSendOrder}
              className="w-full h-14 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Enviar Pedido por WhatsApp</span>
            </a>

            <div className="text-[11px] text-slate-400 text-center leading-tight">
              Al enviar tu pedido, nuestro asesor confirmará existencias y coordinará el despacho contigo inmediatamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
