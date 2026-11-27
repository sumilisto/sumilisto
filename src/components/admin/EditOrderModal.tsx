"use client";

import React, { useState, useMemo, useRef } from "react";
import { Order, OrderItem, OrderStatus, PaymentMethodType } from "@/types/order";
import { Product } from "@/types/product";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { resolveWholesaleLine } from "@/lib/pricing/pricing";
import {
  X,
  Plus,
  Trash2,
  Save,
  Package,
  DollarSign,
  User,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface EditOrderModalProps {
  order: Order;
  products: Product[];
  bcvRate: number;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: Order) => void;
}

export function EditOrderModal({
  order,
  products,
  bcvRate,
  onClose,
  onOrderUpdated,
}: EditOrderModalProps) {
  // Datos del Cliente
  const [clienteNombre, setClienteNombre] = useState(order.clienteNombre || "");
  const [clienteTelefono, setClienteTelefono] = useState(order.clienteTelefono || "");
  const [zonaEntrega, setZonaEntrega] = useState(order.zonaEntrega || "");
  const [direccion, setDireccion] = useState(order.direccion || "");

  // Estado y Pago
  const [estado, setEstado] = useState<OrderStatus>(order.estado || "pendiente");
  const [tipoPago, setTipoPago] = useState<PaymentMethodType | string>(
    order.tipoPago ||
      (order.metodoPago?.toLowerCase().includes("efectivo")
        ? "dolares_efectivo"
        : order.metodoPago?.toLowerCase().includes("usdt")
        ? "usdt"
        : "bolivares")
  );
  const [metodoPago, setMetodoPago] = useState(
    order.metodoPago || "Pago Móvil / Transferencia Bs (Tasa BCV)"
  );
  const [referenciaPago, setReferenciaPago] = useState(order.referenciaPago || "");
  const [tasaBcv, setTasaBcv] = useState<number>(order.tasaBcv || bcvRate || 880.12);
  const [notas, setNotas] = useState(order.notas || "");

  // Gastos fijos
  const [gastoFleteRetiroUsd, setGastoFleteRetiroUsd] = useState(
    order.gastoFleteRetiroUsd !== undefined ? order.gastoFleteRetiroUsd : 5.0
  );
  const [gastoEmbalajeUsd, setGastoEmbalajeUsd] = useState(
    order.gastoEmbalajeUsd !== undefined ? order.gastoEmbalajeUsd : 0.5
  );

  // Lista de Ítems del Pedido
  const [items, setItems] = useState<
    Array<{
      sku: string;
      nombre: string;
      presentacion?: string;
      color?: string;
      cantidad: number;
      precioUnitarioUsd: number;
      costoUnitarioUsd?: number;
      subtotalUsd: number;
      costoTotalUsd?: number;
      tarifa: "mayor" | "gran_mayor";
    }>
  >(
    (order.items || []).map((it) => {
      const prod = products.find(
        (p) => p.sku === it.sku || (p.variantes || []).some((v) => v.sku === it.sku)
      );
      const variant = (prod?.variantes || []).find((v) => v.sku === it.sku);
      const step = variant?.minMayor || prod?.minMayor || (it.tarifa === "gran_mayor" ? 100 : 50);
      const costoUnitario =
        it.costoUnitarioUsd !== undefined ? it.costoUnitarioUsd : it.precioUnitarioUsd * 0.75;
      const costoTotal = Math.round(costoUnitario * (it.cantidad / (step > 0 ? step : 50)) * 100) / 100;

      return {
        sku: it.sku,
        nombre: it.nombre,
        presentacion: it.presentacion,
        color: it.color,
        cantidad: it.cantidad,
        precioUnitarioUsd: it.precioUnitarioUsd,
        costoUnitarioUsd: costoUnitario,
        subtotalUsd: it.subtotalUsd,
        costoTotalUsd: costoTotal,
        tarifa: it.tarifa || "mayor",
      };
    })
  );

  // Selector inteligente para agregar nuevo producto
  const [selectedProdId, setSelectedProdId] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [selectedVariantSku, setSelectedVariantSku] = useState("");
  const [selectedTarifa, setSelectedTarifa] = useState<"mayor" | "gran_mayor">("mayor");
  const [selectedCantidad, setSelectedCantidad] = useState("50");

  const productSearchContainerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Búsqueda inteligente de productos
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProdId || p.sku === selectedProdId);
  }, [products, selectedProdId]);

  const searchFilteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase().trim();
    if (selectedProduct && selectedProduct.nombre.toLowerCase().trim() === q) {
      return products;
    }
    return products.filter((p) => {
      return (
        p.nombre?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.categoria?.toLowerCase().includes(q)
      );
    });
  }, [products, productSearchQuery, selectedProduct]);

  const handleSelectProduct = (productIdOrSku: string) => {
    const prod = products.find((p) => p.id === productIdOrSku || p.sku === productIdOrSku);
    if (!prod) return;
    setSelectedProdId(prod.id || prod.sku);
    setProductSearchQuery(prod.nombre);
    setIsProductSearchOpen(false);

    const firstVarSku = prod.variantes?.[0]?.sku || prod.sku || "";
    setSelectedVariantSku(firstVarSku);

    const minQty = prod.variantes?.[0]?.minMayor || prod.minMayor || 50;
    setSelectedTarifa("mayor");
    setSelectedCantidad(String(minQty));
  };

  const handleClearProductSelection = () => {
    setSelectedProdId("");
    setSelectedVariantSku("");
    setProductSearchQuery("");
    setSelectedTarifa("mayor");
    setIsProductSearchOpen(true);
  };

  const selectedVariant = useMemo(
    () => selectedProduct?.variantes?.find((v) => v.sku === selectedVariantSku) || selectedProduct?.variantes?.[0],
    [selectedProduct, selectedVariantSku]
  );

  const currentStep = useMemo(() => {
    if (!selectedProduct) return 50;
    return selectedVariant?.minMayor || selectedProduct.minMayor || 50;
  }, [selectedProduct, selectedVariant]);

  const previewPricing = useMemo(() => {
    const cant = parseInt(selectedCantidad, 10) || currentStep;
    return resolveWholesaleLine(selectedProduct, selectedVariant, cant);
  }, [selectedProduct, selectedVariant, selectedCantidad, currentStep]);

  const syncCantidadAndTarifa = (
    nextValue: number | string,
    prod = selectedProduct,
    variant = selectedVariant
  ) => {
    setSelectedCantidad(String(nextValue));
    const parsed = typeof nextValue === "number" ? nextValue : parseInt(nextValue, 10);
    if (prod && !isNaN(parsed) && parsed > 0) {
      const resolved = resolveWholesaleLine(prod, variant, parsed);
      setSelectedTarifa(resolved.tarifa);
    }
  };

  const handleChangeTarifa = (tarifa: "mayor" | "gran_mayor") => {
    if (tarifa === "gran_mayor" && previewPricing.hasGranMayor) {
      setSelectedTarifa("gran_mayor");
      if (selectedProduct) {
        setSelectedCantidad(String(previewPricing.minGranMayor));
      }
    } else {
      setSelectedTarifa("mayor");
      if (selectedProduct) {
        setSelectedCantidad(String(previewPricing.minMayor));
      }
    }
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;

    let parsedCantidad = parseInt(selectedCantidad, 10) || currentStep;
    if (parsedCantidad < currentStep) parsedCantidad = currentStep;
    const remainder = parsedCantidad % currentStep;
    if (remainder !== 0) parsedCantidad += currentStep - remainder;

    const resolved = resolveWholesaleLine(selectedProduct, selectedVariant, parsedCantidad);

    setItems((prev) => [
      ...prev,
      {
        sku: selectedVariant?.sku || selectedProduct.sku,
        nombre: selectedProduct.nombre,
        presentacion: selectedVariant?.presentacion || selectedProduct.presentacion || undefined,
        color: selectedVariant?.color || undefined,
        cantidad: parsedCantidad,
        tarifa: resolved.tarifa,
        precioUnitarioUsd: resolved.precioPaquete,
        costoUnitarioUsd: resolved.costoPaquete,
        subtotalUsd: resolved.subtotalUsd,
        costoTotalUsd: resolved.costoTotalUsd,
      },
    ]);

    setSelectedTarifa("mayor");
    setSelectedCantidad(String(currentStep));
    setProductSearchQuery("");
    setSelectedProdId("");
    setSelectedVariantSku("");
  };

  // Modificar cantidad de un ítem existente
  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      const it = next[index];
      const prod = products.find(
        (p) => p.sku === it.sku || (p.variantes || []).some((v) => v.sku === it.sku)
      );
      const variant = (prod?.variantes || []).find((v) => v.sku === it.sku);

      if (prod) {
        const resolved = resolveWholesaleLine(prod, variant, newQty);
        next[index] = {
          ...it,
          cantidad: newQty,
          tarifa: resolved.tarifa,
          precioUnitarioUsd: resolved.precioPaquete,
          costoUnitarioUsd: resolved.costoPaquete,
          subtotalUsd: resolved.subtotalUsd,
          costoTotalUsd: resolved.costoTotalUsd,
        };
      } else {
        const step = it.tarifa === "gran_mayor" ? 100 : 50;
        const paquetes = newQty / step;
        const subtotal = Math.round(it.precioUnitarioUsd * paquetes * 100) / 100;
        const costoTotal = Math.round((it.costoUnitarioUsd || it.precioUnitarioUsd * 0.75) * paquetes * 100) / 100;
        next[index] = {
          ...it,
          cantidad: newQty,
          subtotalUsd: subtotal,
          costoTotalUsd: costoTotal,
        };
      }
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("El pedido debe contener al menos un producto.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Cálculos en vivo
  const calculatedTotals = useMemo(() => {
    let totalUsd = 0;
    let costoMercanciaTotal = 0;

    items.forEach((it) => {
      totalUsd += it.subtotalUsd;
      costoMercanciaTotal += it.costoTotalUsd || 0;
    });

    totalUsd = Math.round(totalUsd * 100) / 100;
    costoMercanciaTotal = Math.round(costoMercanciaTotal * 100) / 100;

    const parsedTasa = Number(tasaBcv) || 880.12;
    const totalVes = calculateVesTotal(totalUsd, parsedTasa);

    const flete = Number(gastoFleteRetiroUsd) || 0;
    const embalaje = Number(gastoEmbalajeUsd) || 0;

    const gananciaBruta = Math.max(0, Math.round((totalUsd - costoMercanciaTotal) * 100) / 100);
    const gananciaNeta = Math.max(0, Math.round((gananciaBruta - flete - embalaje) * 100) / 100);

    return {
      totalUsd,
      totalVes,
      costoMercanciaTotal,
      gananciaBruta,
      gananciaNeta,
      reparto: {
        reinversion: Math.round(gananciaNeta * 0.5 * 100) / 100,
        reserva: Math.round(gananciaNeta * 0.2 * 100) / 100,
        sueldo: Math.round(gananciaNeta * 0.2 * 100) / 100,
        ahorro: Math.round(gananciaNeta * 0.1 * 100) / 100,
      },
    };
  }, [items, tasaBcv, gastoFleteRetiroUsd, gastoEmbalajeUsd]);

  // Guardar Cambios
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      setErrorMsg("El nombre y teléfono del cliente son obligatorios.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Debes incluir al menos un producto en el pedido.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          clienteNombre,
          clienteTelefono,
          zonaEntrega,
          direccion,
          metodoPago,
          tipoPago,
          referenciaPago: referenciaPago ? referenciaPago.trim() : undefined,
          notas,
          estado,
          tasaBcv,
          gastoFleteRetiroUsd,
          gastoEmbalajeUsd,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo actualizar el pedido");
      }

      onOrderUpdated(data.order);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar los cambios del pedido.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 font-mono">
                  Editar Pedido {order.codigo}
                </h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    order.origen === "web"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {order.origen === "web" ? "Tienda Web" : "Carga Manual"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Modifica los datos del cliente, despacho, productos, cantidades o pagos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body con Scroll */}
        <form onSubmit={handleSaveOrder} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECCIÓN 1: DATOS DEL CLIENTE Y DESPACHO */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-black uppercase text-slate-500 mb-3 tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span>1. Cliente y Despacho</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre o Razón Social *</label>
                <input
                  type="text"
                  required
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Osma Bakery"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej: 04227864547"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Zona de Entrega</label>
                <input
                  type="text"
                  value={zonaEntrega}
                  onChange={(e) => setZonaEntrega(e.target.value)}
                  placeholder="Ej: Caracas, Guarenas, Guatire o Nacional"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección / Agencia Encomienda</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: MRW Calle Principal o Entrega en Bodega"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: ESTADO Y MÉTODO DE PAGO */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-black uppercase text-slate-500 mb-3 tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. Estado del Pedido y Pago</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado del Pedido</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer focus:outline-emerald-600"
                >
                  <option value="pendiente">🕒 Pendiente</option>
                  <option value="pagado">💳 Pagado</option>
                  <option value="despachado">🚚 Despachado</option>
                  <option value="entregado">✅ Entregado</option>
                  <option value="cancelado">❌ Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoPago("bolivares");
                      setMetodoPago("Pago Móvil / Transferencia Bs (Tasa BCV)");
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                      tipoPago === "bolivares"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Bs. BCV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipoPago("dolares_efectivo");
                      setMetodoPago("Dólares en Efectivo ($ Cash)");
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                      tipoPago === "dolares_efectivo"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    $ Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipoPago("usdt");
                      setMetodoPago("USDT (Binance / Cripto)");
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                      tipoPago === "usdt"
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-black"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    USDT
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Referencia (6 dígitos)</label>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {referenciaPago.length}/6
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Ej: 849201"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tasa BCV (Bs. / USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tasaBcv}
                  onChange={(e) => setTasaBcv(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Flete de Retiro ($)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={gastoFleteRetiroUsd}
                  onChange={(e) => setGastoFleteRetiroUsd(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gasto Embalaje ($)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={gastoEmbalajeUsd}
                  onChange={(e) => setGastoEmbalajeUsd(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: ARTÍCULOS ACTUALES DEL PEDIDO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-700" />
                <span>3. Artículos en el Pedido ({items.length})</span>
              </h4>
              <span className="text-xs font-bold text-slate-500">
                Total Artículos: {items.reduce((acc, it) => acc + it.cantidad, 0)} unds
              </span>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => {
                const prod = products.find(
                  (p) => p.sku === it.sku || (p.variantes || []).some((v) => v.sku === it.sku)
                );
                const variant = (prod?.variantes || []).find((v) => v.sku === it.sku);
                const step = variant?.minMayor || prod?.minMayor || (it.tarifa === "gran_mayor" ? 100 : 50);

                return (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 leading-tight">
                          {it.nombre}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            it.tarifa === "gran_mayor"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {it.tarifa === "gran_mayor" ? "Gran Mayor" : "Mayor"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {(it.presentacion || it.color) && (
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {it.presentacion || it.color}
                          </span>
                        )}
                        <span className="font-mono text-slate-400">SKU: {it.sku}</span>
                        <span>· Paquete: {formatUsd(it.precioUnitarioUsd)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      {/* Stepper de cantidad */}
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, Math.max(step, it.cantidad - step))}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-sm shadow-2xs cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={step}
                          step={step}
                          value={it.cantidad}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) handleUpdateItemQuantity(idx, val);
                          }}
                          className="w-16 h-7 text-center bg-white rounded-lg text-xs font-black border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, it.cantidad + step)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-sm shadow-2xs cursor-pointer"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-slate-500 font-bold px-1">unds</span>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[70px]">
                        <span className="text-xs font-black text-slate-900 block">
                          {formatUsd(it.subtotalUsd)}
                        </span>
                      </div>

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar producto del pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 4: AGREGAR MÁS PRODUCTOS */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              <span>4. Agregar Otro Producto al Pedido</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Buscador inteligente */}
              <div className="sm:col-span-2 relative" ref={productSearchContainerRef}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Buscar en Catálogo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setIsProductSearchOpen(true);
                    }}
                    onFocus={() => setIsProductSearchOpen(true)}
                    onClick={() => setIsProductSearchOpen(true)}
                    placeholder="Buscar producto o SKU..."
                    className="w-full px-3 py-1.5 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600 cursor-pointer"
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={handleClearProductSelection}
                      className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isProductSearchOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsProductSearchOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 divide-y divide-slate-100">
                      {searchFilteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-bold">
                          No se encontraron productos coincidentes
                        </div>
                      ) : (
                        searchFilteredProducts.map((p) => (
                          <button
                            key={p.id || p.sku}
                            type="button"
                            onClick={() => handleSelectProduct(p.id || p.sku || "")}
                            className={`w-full text-left p-2.5 transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                              p.id === selectedProdId ? "bg-emerald-50 text-emerald-950 font-bold" : "hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{p.nombre}</p>
                              <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>
                            </div>
                            <span className="text-[11px] font-black text-emerald-800 shrink-0">
                              {formatUsd(p.precioMayorUsd || 0)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Variante / Color
                </label>
                <select
                  value={selectedVariantSku}
                  onChange={(e) => {
                    setSelectedVariantSku(e.target.value);
                    const nextVar = selectedProduct?.variantes?.find((v) => v.sku === e.target.value);
                    const minUnits = nextVar?.minMayor || selectedProduct?.minMayor || 50;
                    setSelectedTarifa("mayor");
                    setSelectedCantidad(String(minUnits));
                  }}
                  disabled={!selectedProduct || (selectedProduct.variantes || []).length <= 1}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium disabled:opacity-50"
                >
                  {(selectedProduct?.variantes || []).map((v) => (
                    <option key={v.sku} value={v.sku}>
                      {v.color || v.presentacion || v.sku}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Tarifa
                </label>
                <select
                  value={selectedTarifa}
                  onChange={(e) => handleChangeTarifa(e.target.value as "mayor" | "gran_mayor")}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="mayor">Mayor</option>
                  <option
                    value="gran_mayor"
                    disabled={Boolean(selectedProduct) && !previewPricing.hasGranMayor}
                  >
                    Gran Mayor
                    {selectedProduct && previewPricing.hasGranMayor
                      ? ` (Mín. ${previewPricing.minGranMayor})`
                      : ""}
                  </option>
                </select>
              </div>
            </div>

            {/* Stepper y Añadir */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Cantidad ({currentStep} en {currentStep})
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(selectedCantidad, 10) || currentStep;
                      const next = Math.max(currentStep, cur - currentStep);
                      syncCantidadAndTarifa(next);
                    }}
                    className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={currentStep}
                    step={currentStep}
                    value={selectedCantidad}
                    onChange={(e) => syncCantidadAndTarifa(e.target.value)}
                    className="w-20 h-8 px-2 text-center bg-white border border-slate-200 rounded-lg text-xs font-black"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(selectedCantidad, 10) || currentStep;
                      syncCantidadAndTarifa(cur + currentStep);
                    }}
                    className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-sm cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-xs font-bold text-slate-500 ml-1">unds</span>

                  {selectedProduct && (
                    <span className="ml-2 text-xs font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      = {formatUsd(previewPricing.subtotalUsd)}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProduct}
                className="h-8 px-4 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Producto</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 5: OBSERVACIONES */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones / Notas del Pedido
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones para despacho, pago acordado, horario..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
            />
          </div>

          {/* SECCIÓN 6: RESUMEN FINANCIERO Y TOTALES EN VIVO */}
          <div className="bg-emerald-950 text-white p-4 sm:p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/80 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-300 tracking-wider">
                  Total del Pedido (USD)
                </p>
                <p className="text-3xl font-black text-white">
                  {formatUsd(calculatedTotals.totalUsd)}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] font-bold uppercase text-emerald-300 tracking-wider">
                  Total en Bolívares (BCV Bs. {tasaBcv.toFixed(2)})
                </p>
                <p className="text-xl font-extrabold text-emerald-200">
                  {formatVes(calculatedTotals.totalVes)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-800/50">
                <p className="text-[10px] text-emerald-300 font-semibold">Costo Mercancía</p>
                <p className="text-sm font-black mt-0.5">{formatUsd(calculatedTotals.costoMercanciaTotal)}</p>
              </div>
              <div className="bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-800/50">
                <p className="text-[10px] text-emerald-300 font-semibold">Ganancia Bruta</p>
                <p className="text-sm font-black text-emerald-300 mt-0.5">{formatUsd(calculatedTotals.gananciaBruta)}</p>
              </div>
              <div className="bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-800/50">
                <p className="text-[10px] text-emerald-300 font-semibold">Gastos (Flete+Emb)</p>
                <p className="text-sm font-black text-amber-300 mt-0.5">
                  {formatUsd(gastoFleteRetiroUsd + gastoEmbalajeUsd)}
                </p>
              </div>
              <div className="bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-800/50">
                <p className="text-[10px] text-emerald-300 font-semibold">Ganancia Neta</p>
                <p className="text-sm font-black text-emerald-200 mt-0.5">{formatUsd(calculatedTotals.gananciaNeta)}</p>
              </div>
            </div>

            <div className="bg-emerald-900/30 p-2 rounded-xl text-[10px] text-emerald-300 flex flex-wrap items-center justify-between gap-1">
              <span>Reparto de Utilidad:</span>
              <span>50% Reinversión: {formatUsd(calculatedTotals.reparto.reinversion)}</span>
              <span>20% Reserva: {formatUsd(calculatedTotals.reparto.reserva)}</span>
              <span>20% Sueldo: {formatUsd(calculatedTotals.reparto.sueldo)}</span>
              <span>10% Ahorro: {formatUsd(calculatedTotals.reparto.ahorro)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || items.length === 0}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando Cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios del Pedido</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
