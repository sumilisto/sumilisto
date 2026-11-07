"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { Order, OrderItem, OrderStatus, DEFAULT_ACCOUNTING_SETTINGS } from "@/types/order";
import { Product } from "@/types/product";
import { AdminNav } from "@/components/admin/AdminNav";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import {
  Calculator,
  Plus,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Wallet,
  PiggyBank,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  X,
  Lock,
  User,
  AlertCircle,
  FileText,
  Percent,
} from "lucide-react";

export default function AdminContabilidadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bcvRate, setBcvRate] = useState<number>(880.12);

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<"mes" | "todo">("mes");

  // Modal de pedido manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Formulario de pedido manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualTelefono, setManualTelefono] = useState("");
  const [manualZona, setManualZona] = useState("Caracas");
  const [manualDireccion, setManualDireccion] = useState("");
  const [manualMetodo, setManualMetodo] = useState("Pago Móvil / Transferencia Bs (Tasa BCV)");
  const [manualNotas, setManualNotas] = useState("");
  const [manualItems, setManualItems] = useState<
    Array<{
      productoId: string;
      sku: string;
      nombre: string;
      color?: string;
      presentacion?: string;
      cantidad: number;
      unidadesPorPaquete: number;
      tarifa: "mayor" | "gran_mayor";
      precioPaquete: number;
      costoPaquete: number;
      subtotalUsd: number;
      costoTotalUsd: number;
    }>
  >([]);

  // Item temporal para agregar
  const [selectedProdId, setSelectedProdId] = useState("");
  const [selectedVariantSku, setSelectedVariantSku] = useState("");
  const [selectedTarifa, setSelectedTarifa] = useState<"mayor" | "gran_mayor">("mayor");
  const [selectedCantidad, setSelectedCantidad] = useState("1");

  // Flete, IVA y embalaje del pedido manual
  const [manualFleteOpcion, setManualFleteOpcion] = useState<string>("5.00");
  const [manualEmbalaje, setManualEmbalaje] = useState<string>("0.50");
  const [manualConIva, setManualConIva] = useState<boolean>(false); // false = Sin IVA / Nota de Entrega (100% Ganancia Neta)

  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) {
        loadData();
      }
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, prodsRes, bcvRes] = await Promise.all([
        fetch("/api/orders").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/bcv").then((r) => r.json()),
      ]);

      if (ordersRes?.ok && Array.isArray(ordersRes.orders)) {
        setOrders(ordersRes.orders);
      }
      if (Array.isArray(prodsRes)) {
        setProducts(prodsRes);
      }
      if (bcvRes?.rate) {
        setBcvRate(Number(bcvRes.rate));
      }
    } catch (err) {
      console.error("Error cargando datos contables:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const res = await loginAdmin(usernameInput, passwordInput);
      if (res.ok) {
        setIsAuthenticated(true);
        loadData();
      } else {
        setAuthError(res.error || "Credenciales incorrectas.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  // Normalizador de fecha en formato YYYY-MM-DD para agrupar pedidos del mismo día
  const getOrderDateKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Filtrado de pedidos
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return orders.filter((ord) => {
      if (filterEstado !== "todos" && ord.estado !== filterEstado) {
        return false;
      }
      if (selectedRange === "mes") {
        const ordDate = new Date(ord.createdAt);
        if (ordDate.getMonth() !== currentMonth || ordDate.getFullYear() !== currentYear) {
          return false;
        }
      }
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase();
        const matchesCode = ord.codigo?.toLowerCase().includes(q);
        const matchesName = ord.clienteNombre?.toLowerCase().includes(q);
        const matchesPhone = ord.clienteTelefono?.toLowerCase().includes(q);
        return matchesCode || matchesName || matchesPhone;
      }
      return true;
    });
  }, [orders, filterEstado, selectedRange, searchTerm]);

  // Mapa de cuántos pedidos activos se registraron en cada fecha (para prorratear viaje al proveedor de $5)
  const ordersCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      if (o.estado !== "cancelado") {
        const key = getOrderDateKey(o.createdAt);
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [filteredOrders]);

  // Cantidad de pedidos activos registrados hoy
  const ordersTodayCount = useMemo(() => {
    const todayKey = getOrderDateKey(new Date().toISOString());
    return orders.filter((o) => o.estado !== "cancelado" && getOrderDateKey(o.createdAt) === todayKey).length;
  }, [orders]);

  // Flete de retiro asignado a cada pedido según la cantidad de pedidos de ese día:
  // Se divide el viaje de $5 entre los pedidos registrados en la misma fecha (1 pedido: $5, 2 pedidos: $2.50, etc.)
  const getEffectiveFlete = (ord: Order) => {
    const key = getOrderDateKey(ord.createdAt);
    const countToday = ordersCountByDate[key] || 1;
    return Math.round((5.0 / countToday) * 100) / 100;
  };

  // Cálculo exacto de Ganancia Neta por pedido:
  // Si es Con IVA: se separa el 16% de débito fiscal para el SENIAT (no se computa como ganancia)
  // Si es Sin IVA (Nota de Entrega): ese 16% se retiene íntegro y se suma como GANANCIA NETA
  const getOrderGananciaNeta = (ord: Order) => {
    const total = ord.totalUsd || 0;
    const costo = ord.costoMercanciaUsd || 0;
    const margenBruto = Math.max(0, total - costo);
    const flete = getEffectiveFlete(ord);
    const embalaje = ord.gastoEmbalajeUsd !== undefined ? ord.gastoEmbalajeUsd : 0.5;

    const ivaMonto = ord.conIva
      ? ord.ivaMontoUsd !== undefined
        ? ord.ivaMontoUsd
        : Math.round((total - total / 1.16) * 100) / 100
      : 0;

    return Math.max(0, Math.round((margenBruto - ivaMonto - flete - embalaje) * 100) / 100);
  };

  // Cálculos Contables y P&L
  const metrics = useMemo(() => {
    let facturacionTotal = 0;
    let costoMercanciaTotal = 0;
    let fletesRetiroTotal = 0;
    let embalajeTotal = 0;
    let ivaSeniatTotal = 0;
    const uniqueDays = new Set<string>();

    filteredOrders.forEach((o) => {
      if (o.estado !== "cancelado") {
        facturacionTotal += o.totalUsd || 0;
        costoMercanciaTotal += o.costoMercanciaUsd || 0;
        embalajeTotal += o.gastoEmbalajeUsd !== undefined ? o.gastoEmbalajeUsd : 0.5;

        const flete = getEffectiveFlete(o);
        fletesRetiroTotal += flete;

        if (o.conIva) {
          const iva =
            o.ivaMontoUsd !== undefined
              ? o.ivaMontoUsd
              : Math.round(((o.totalUsd || 0) - (o.totalUsd || 0) / 1.16) * 100) / 100;
          ivaSeniatTotal += iva;
        }

        uniqueDays.add(getOrderDateKey(o.createdAt));
      }
    });

    const gananciaBruta = Math.max(0, facturacionTotal - costoMercanciaTotal);
    const margenBrutoPorc = facturacionTotal > 0 ? (gananciaBruta / facturacionTotal) * 100 : 0;

    // Gastos Fijos Mensuales del Negocio
    const sueldoFijo = DEFAULT_ACCOUNTING_SETTINGS.sueldoFijoMensual; // $800
    const internet = DEFAULT_ACCOUNTING_SETTINGS.internetMensual; // $25
    const luz = DEFAULT_ACCOUNTING_SETTINGS.luzMensual; // $10
    const dominio = DEFAULT_ACCOUNTING_SETTINGS.dominioMensual; // $1
    const totalGastosFijos = sueldoFijo + internet + luz + dominio; // $836

    // Punto de Equilibrio: Con un 20% de ganancia neta meta, se requiere facturar:
    // Ventas de Equilibrio = $836 / 0.20 = $4,180.00
    const ventasEquilibrioMeta = totalGastosFijos / (DEFAULT_ACCOUNTING_SETTINGS.margenMetaPorcentaje / 100);
    const progresoEquilibrio = Math.min(100, Math.round((facturacionTotal / ventasEquilibrioMeta) * 100));
    const faltaParaEquilibrio = Math.max(0, ventasEquilibrioMeta - facturacionTotal);

    // Ganancia Neta Real (Utilidad Distribuible después de fletes, embalajes y cuota SENIAT si aplica)
    const gananciaNetaOperativa = Math.max(
      0,
      gananciaBruta - ivaSeniatTotal - fletesRetiroTotal - embalajeTotal
    );

    // Reparto de la ganancia con tu regla:
    const reparto = {
      reinversion: Math.round(gananciaNetaOperativa * 0.5 * 100) / 100, // 50%
      reserva: Math.round(gananciaNetaOperativa * 0.2 * 100) / 100, // 20%
      sueldo: Math.round(gananciaNetaOperativa * 0.2 * 100) / 100, // 20%
      ahorro: Math.round(gananciaNetaOperativa * 0.1 * 100) / 100, // 10%
    };

    return {
      facturacionTotal: Math.round(facturacionTotal * 100) / 100,
      costoMercanciaTotal: Math.round(costoMercanciaTotal * 100) / 100,
      fletesRetiroTotal: Math.round(fletesRetiroTotal * 100) / 100,
      embalajeTotal: Math.round(embalajeTotal * 100) / 100,
      totalViajes: uniqueDays.size,
      ivaSeniatTotal: Math.round(ivaSeniatTotal * 100) / 100,
      gananciaBruta: Math.round(gananciaBruta * 100) / 100,
      margenBrutoPorc: Math.round(margenBrutoPorc * 10) / 10,
      totalGastosFijos,
      ventasEquilibrioMeta,
      progresoEquilibrio,
      faltaParaEquilibrio: Math.round(faltaParaEquilibrio * 100) / 100,
      gananciaNetaOperativa: Math.round(gananciaNetaOperativa * 100) / 100,
      reparto,
    };
  }, [filteredOrders, ordersCountByDate]);

  // Manejo de productos en formulario manual
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProdId);
  }, [products, selectedProdId]);

  const selectedVariant = useMemo(() => {
    if (!selectedProduct) return null;
    const variants = selectedProduct.variantes || [];
    return variants.find((v) => v.sku === selectedVariantSku) || variants[0];
  }, [selectedProduct, selectedVariantSku]);

  // Cantidad mínima y salto según producto y tarifa seleccionada (Mayor vs Gran Mayor)
  const currentStep = useMemo(() => {
    if (!selectedProduct) return 50;
    if (selectedTarifa === "gran_mayor") {
      return selectedVariant?.minGranMayor || selectedProduct.minGranMayor || 100;
    }
    return selectedVariant?.minMayor || selectedProduct.minMayor || 50;
  }, [selectedProduct, selectedVariant, selectedTarifa]);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = products.find((p) => p.id === prodId);
    const firstVariant = prod?.variantes?.[0];
    const firstSku = firstVariant?.sku || "";
    setSelectedVariantSku(firstSku);

    const minUnits =
      selectedTarifa === "gran_mayor"
        ? firstVariant?.minGranMayor || prod?.minGranMayor || 100
        : firstVariant?.minMayor || prod?.minMayor || 50;

    setSelectedCantidad(String(minUnits));
  };

  const handleChangeTarifa = (tarifa: "mayor" | "gran_mayor") => {
    setSelectedTarifa(tarifa);
    const minUnits =
      tarifa === "gran_mayor"
        ? selectedVariant?.minGranMayor || selectedProduct?.minGranMayor || 100
        : selectedVariant?.minMayor || selectedProduct?.minMayor || 50;

    setSelectedCantidad(String(minUnits));
  };

  const handleAddProductToManual = () => {
    if (!selectedProduct) return;
    const variants = selectedProduct.variantes || [];
    const variant = variants.find((v) => v.sku === selectedVariantSku) || variants[0];
    const qty = parseInt(selectedCantidad, 10);
    if (isNaN(qty) || qty <= 0) return;

    const unidadesPorPaquete =
      selectedTarifa === "gran_mayor"
        ? variant?.minGranMayor || selectedProduct.minGranMayor || 100
        : variant?.minMayor || selectedProduct.minMayor || 50;

    const precioPaquete =
      selectedTarifa === "gran_mayor"
        ? variant?.precioGranMayorUsd || selectedProduct.precioGranMayorUsd || 0
        : variant?.precioMayorUsd || selectedProduct.precioMayorUsd || 0;

    const costoPaquete =
      selectedTarifa === "gran_mayor"
        ? variant?.costoGranMayorUsd || selectedProduct.costoGranMayorUsd || precioPaquete * 0.75
        : variant?.costoMayorUsd || selectedProduct.costoMayorUsd || precioPaquete * 0.75;

    const paquetes = qty / unidadesPorPaquete;
    const subtotalUsd = Math.round(precioPaquete * paquetes * 100) / 100;
    const costoTotalUsd = Math.round(costoPaquete * paquetes * 100) / 100;

    setManualItems((prev) => [
      ...prev,
      {
        productoId: selectedProduct.id || selectedProduct.sku || "",
        sku: variant?.sku || selectedProduct.sku,
        nombre: selectedProduct.nombre,
        color: variant?.color,
        presentacion: variant?.presentacion || selectedProduct.presentacion,
        cantidad: qty,
        unidadesPorPaquete,
        tarifa: selectedTarifa,
        precioPaquete,
        costoPaquete,
        subtotalUsd,
        costoTotalUsd,
      },
    ]);

    setSelectedCantidad(String(currentStep));
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const manualTotalUsd = useMemo(() => {
    return Math.round(manualItems.reduce((acc, it) => acc + (it.subtotalUsd || 0), 0) * 100) / 100;
  }, [manualItems]);

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNombre.trim() || !manualTelefono.trim()) {
      alert("Por favor ingresa nombre y teléfono del cliente.");
      return;
    }
    if (manualItems.length === 0) {
      alert("Por favor agrega al menos un producto al pedido.");
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNombre: manualNombre,
          clienteTelefono: manualTelefono,
          zonaEntrega: manualZona,
          direccion: manualDireccion,
          metodoPago: manualMetodo,
          notas: manualNotas,
          items: manualItems,
          conIva: manualConIva,
          gastoFleteRetiroUsd: parseFloat(manualFleteOpcion),
          gastoEmbalajeUsd: parseFloat(manualEmbalaje),
          tasaBcv: bcvRate,
        }),
      });

      const data = await res.json();
      if (data?.ok && data.whatsappUrl) {
        // Abrir inmediatamente la ventana de chat con el cliente
        window.open(data.whatsappUrl, "_blank");

        // Limpiar formulario y cerrar modal
        setManualNombre("");
        setManualTelefono("");
        setManualDireccion("");
        setManualNotas("");
        setManualItems([]);
        setManualConIva(false);
        setIsModalOpen(false);

        // Recargar pedidos
        await loadData();
      } else {
        alert(data.error || "No se pudo crear el pedido.");
      }
    } catch (err: any) {
      alert("Error creando pedido: " + err.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, estado: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, estado: newStatus } : o))
        );
      }
    } catch (err) {
      console.error("Error actualizando estado:", err);
    }
  };

  // Actualizar régimen fiscal (Con IVA vs Sin IVA)
  const handleUpdateFiscal = async (orderId: string, newConIva: boolean) => {
    // 1. Actualización inmediata y reactiva en UI
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId && o.codigo !== orderId) return o;
        const total = o.totalUsd || 0;
        const iva = newConIva ? Math.round((total - total / 1.16) * 100) / 100 : 0;
        return {
          ...o,
          conIva: newConIva,
          ivaMontoUsd: iva,
        };
      })
    );

    // 2. Persistir en la base de datos
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, conIva: newConIva }),
      });
      if (!res.ok) {
        console.error("Error guardando régimen fiscal en API:", await res.text());
      }
    } catch (err) {
      console.error("Error actualizando régimen fiscal:", err);
    }
  };

  // Actualizar costo de flete asignado al pedido
  const handleUpdateFlete = async (orderId: string, newFlete: number) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, gastoFleteRetiroUsd: newFlete }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, gastoFleteRetiroUsd: newFlete } : o))
        );
      }
    } catch (err) {
      console.error("Error actualizando flete:", err);
    }
  };

  // Pantalla de login
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mb-3 shadow-xs">
              <Calculator className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900">Contabilidad y Pedidos</h1>
            <p className="text-xs text-slate-500 mt-1">Sumilisto · Acceso Privado de Administración</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-emerald-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-emerald-600"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      <AdminNav onLogout={() => setIsAuthenticated(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* ENCABEZADO Y ACCIONES PRINCIPALES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contabilidad y Pedidos</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                P&L en Vivo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Control de ingresos, costos de mercancía, retiros, embalaje y reparto automático de utilidades.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Selector de Rango */}
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center text-xs font-bold shadow-2xs">
              <button
                onClick={() => setSelectedRange("mes")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedRange === "mes" ? "bg-emerald-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => setSelectedRange("todo")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedRange === "todo" ? "bg-emerald-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Histórico
              </button>
            </div>

            {/* Botón de Montar Pedido Manual */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Montar Pedido Manual</span>
            </button>
          </div>
        </div>

        {/* 1. SECCIÓN DE PUNTO DE EQUILIBRIO CON SUELDO FIJO DE $800 */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                <TargetIcon className="w-4 h-4" />
                <span>Punto de Equilibrio Mensual (Break-Even)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Meta de Facturación: {formatUsd(metrics.ventasEquilibrioMeta)} / mes
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Calculado para cubrir al 100% tu <strong>sueldo fijo de $800.00</strong> + Internet ($25) + Luz ($10) + Dominio ($1) = <strong>$836.00 de gastos fijos</strong>, con tu margen neto objetivo del 20%.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 shrink-0">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Gastos Fijos Asignados</p>
                <p className="text-xl font-black text-emerald-300">{formatUsd(metrics.totalGastosFijos)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">$800 sueldo + $36 servicios</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Tasa BCV del Día</p>
                <p className="text-xl font-black text-white">{bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">Bs./USD Oficial</p>
              </div>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span>Progreso hacia la meta: {formatUsd(metrics.facturacionTotal)} ({metrics.progresoEquilibrio}%)</span>
              <span className={metrics.faltaParaEquilibrio === 0 ? "text-emerald-400 font-extrabold" : "text-amber-300 font-semibold"}>
                {metrics.faltaParaEquilibrio === 0
                  ? "🎉 ¡Punto de equilibrio superado! A partir de aquí todo es utilidad extra"
                  : `Faltan ${formatUsd(metrics.faltaParaEquilibrio)} para cubrir sueldo y gastos fijos`}
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-700/80 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${metrics.progresoEquilibrio}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. TARJETAS FINANCIERAS RESUMEN (P&L) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Ventas Totales</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{formatUsd(metrics.facturacionTotal)}</p>
            <p className="text-xs text-slate-500 mt-1">
              ≈ {formatVes(calculateVesTotal(metrics.facturacionTotal, bcvRate))}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Costo Mercancía (CMV)</span>
              <Package className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-2xl font-black text-slate-800">{formatUsd(metrics.costoMercanciaTotal)}</p>
            <p className="text-xs text-slate-500 mt-1">Lo que pagaste a proveedores</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Flete y Embalaje</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-900">
              {formatUsd(metrics.fletesRetiroTotal + metrics.embalajeTotal)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Fletes: {formatUsd(metrics.fletesRetiroTotal)} ({metrics.totalViajes} {metrics.totalViajes === 1 ? "viaje" : "viajes"}) · Embalaje: {formatUsd(metrics.embalajeTotal)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Ganancia Neta</span>
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-2xl font-black text-emerald-800">{formatUsd(metrics.gananciaNetaOperativa)}</p>
            <p className="text-xs text-emerald-700 mt-1">
              {metrics.ivaSeniatTotal > 0 ? (
                <span>SENIAT apartado: <strong>{formatUsd(metrics.ivaSeniatTotal)}</strong></span>
              ) : (
                <span>100% Ventas Sin IVA (Utilidad Completa)</span>
              )}
            </p>
          </div>
        </div>

        {/* 3. REPARTO DE LA GANANCIA NETA (LAS 4 CUENTAS / BALDES) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-700" />
              <span>Distribución Automática de Ganancia (Las 4 Cuentas)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Así se dividen tus {formatUsd(metrics.gananciaNetaOperativa)} de ganancia neta acumulada en este período:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 50% Reinversión */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-white font-black text-[10px]">
                  50%
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-800" />
              </div>
              <h4 className="text-xs font-bold uppercase text-emerald-950">Reinversión</h4>
              <p className="text-2xl font-black text-emerald-900 mt-1">{formatUsd(metrics.reparto.reinversion)}</p>
              <p className="text-[11px] text-emerald-800/80 mt-2 leading-relaxed">
                Para Meta Ads ($1 a $3 diarios) y compra de más inventario a Gran Mayor.
              </p>
            </div>

            {/* 20% Reserva */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-800 text-white font-black text-[10px]">
                  20%
                </span>
                <ShieldAlert className="w-4 h-4 text-amber-800" />
              </div>
              <h4 className="text-xs font-bold uppercase text-amber-950">Fondo de Emergencia</h4>
              <p className="text-2xl font-black text-amber-900 mt-1">{formatUsd(metrics.reparto.reserva)}</p>
              <p className="text-[11px] text-amber-800/80 mt-2 leading-relaxed">
                Colchón en efectivo/USDT para imprevistos operativos o fluctuaciones.
              </p>
            </div>

            {/* 20% Sueldo */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-800 text-white font-black text-[10px]">
                  20%
                </span>
                <User className="w-4 h-4 text-blue-800" />
              </div>
              <h4 className="text-xs font-bold uppercase text-blue-950">Tu Sueldo (Abono)</h4>
              <p className="text-2xl font-black text-blue-900 mt-1">{formatUsd(metrics.reparto.sueldo)}</p>
              <p className="text-[11px] text-blue-800/80 mt-2 leading-relaxed">
                Compensación del dueño (hacia la meta fija de $800 mensual).
              </p>
            </div>

            {/* 10% Ahorro */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-full bg-purple-800 text-white font-black text-[10px]">
                  10%
                </span>
                <PiggyBank className="w-4 h-4 text-purple-800" />
              </div>
              <h4 className="text-xs font-bold uppercase text-purple-950">Ahorro e Inversión</h4>
              <p className="text-2xl font-black text-purple-900 mt-1">{formatUsd(metrics.reparto.ahorro)}</p>
              <p className="text-[11px] text-purple-800/80 mt-2 leading-relaxed">
                Para maquinaria de empaque, depósito propio y proyectos futuros.
              </p>
            </div>
          </div>
        </div>

        {/* 4. LIBRO DE PEDIDOS (WEB Y MANUALES) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                <span>Libro de Pedidos ({filteredOrders.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pedidos recibidos por la web y cargados manualmente. Códigos no correlativos (#SUMI-XXXX).
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar #SUMI o cliente..."
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-600 w-48 sm:w-60"
                />
              </div>

              {/* Filtro Estado */}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700"
              >
                <option value="todos">Todos los Estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="pagado">Pagados</option>
                <option value="despachado">Despachados</option>
                <option value="entregado">Entregados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Tabla de Pedidos */}
          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">No hay pedidos registrados con estos filtros</p>
                <p className="text-xs text-slate-400 mt-1">Presiona &quot;+ Montar Pedido Manual&quot; para registrar tu primera venta.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cliente / Contacto</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Total USD / Bs</th>
                    <th className="py-3 px-4">Costo Mercancía</th>
                    <th className="py-3 px-4">Régimen (IVA)</th>
                    <th className="py-3 px-4">Flete Retiro</th>
                    <th className="py-3 px-4">Ganancia Neta</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredOrders.map((ord) => {
                    // Normalizar número telefónico para WhatsApp
                    let rawPhone = ord.clienteTelefono?.replace(/[^0-9]/g, "") || "";
                    if (rawPhone.startsWith("0")) rawPhone = "58" + rawPhone.slice(1);
                    else if (!rawPhone.startsWith("58") && rawPhone.length === 10) rawPhone = "58" + rawPhone;

                    const whatsappChatUrl = `https://wa.me/${rawPhone}`;
                    const effectiveFlete = getEffectiveFlete(ord);
                    const sameDayCount = ordersCountByDate[getOrderDateKey(ord.createdAt)] || 1;
                    const orderNetProfit = getOrderGananciaNeta(ord);
                    const ivaSeparado = ord.conIva
                      ? ord.ivaMontoUsd !== undefined
                        ? ord.ivaMontoUsd
                        : Math.round(((ord.totalUsd || 0) - (ord.totalUsd || 0) / 1.16) * 100) / 100
                      : 0;

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono">
                              {ord.codigo}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                ord.origen === "web"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {ord.origen === "web" ? "Web" : "Manual"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{ord.clienteNombre}</p>
                          <a
                            href={whatsappChatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 mt-0.5"
                          >
                            <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                            <span>{ord.clienteTelefono}</span>
                          </a>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(ord.createdAt).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-slate-900">{formatUsd(ord.totalUsd)}</p>
                          <p className="text-[10px] text-slate-400">
                            {formatVes(ord.totalVes || calculateVesTotal(ord.totalUsd, ord.tasaBcv || bcvRate))}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-semibold">
                          {formatUsd(ord.costoMercanciaUsd || 0)}
                        </td>

                        {/* SELECTOR INTERACTIVO DE RÉGIMEN FISCAL (CON IVA VS SIN IVA) */}
                        <td className="py-3.5 px-4">
                          <select
                            value={ord.conIva ? "con_iva" : "sin_iva"}
                            onChange={(e) => handleUpdateFiscal(ord.id, e.target.value === "con_iva")}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer outline-none transition-colors ${
                              ord.conIva
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            <option value="sin_iva">🟢 Sin IVA (Ganancia 100%)</option>
                            <option value="con_iva">🏛️ Con IVA (16% SENIAT)</option>
                          </select>
                        </td>

                        {/* FLETE DE RETIRO AUTOMÁTICO SEGÚN PEDIDOS DEL DÍA */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-black text-amber-950 text-sm">
                              {formatUsd(effectiveFlete)}
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 mt-0.5">
                              <span>🚚</span>
                              <span>
                                {sameDayCount} {sameDayCount === 1 ? "pedido hoy" : "pedidos hoy"}
                              </span>
                            </span>
                          </div>
                        </td>

                        {/* GANANCIA NETA RECALCULADA EN VIVO */}
                        <td className="py-3.5 px-4">
                          <p className="font-black text-emerald-700 text-sm">+{formatUsd(orderNetProfit)}</p>
                          <p className="text-[10px] text-slate-500">
                            {ord.conIva ? (
                              <span className="text-blue-700 font-semibold">SENIAT: -{formatUsd(ivaSeparado)}</span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Margen Íntegro</span>
                            )}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={ord.estado}
                            onChange={(e) => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                              ord.estado === "entregado"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : ord.estado === "pagado"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : ord.estado === "despachado"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : ord.estado === "cancelado"
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="pagado">Pagado</option>
                            <option value="despachado">Despachado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={whatsappChatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-all"
                            title="Abrir chat de WhatsApp con el cliente"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* 5. MODAL DE CREACIÓN MANUAL DE PEDIDO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-700" />
                  <span>Montar Pedido Manual</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registra un pedido cerrado por WhatsApp o llamada. Se asignará un código <strong>#SUMI-XXXX</strong> y se abrirá el chat con el cliente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-6">
              {/* DATOS DEL CLIENTE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Cliente <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualNombre}
                    onChange={(e) => setManualNombre(e.target.value)}
                    placeholder="Ej. Distribuidora Santa María / Carlos"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={manualTelefono}
                    onChange={(e) => setManualTelefono(e.target.value)}
                    placeholder="Ej. 04121234567 o 584121234567"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zona de Entrega</label>
                  <select
                    value={manualZona}
                    onChange={(e) => setManualZona(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-emerald-600"
                  >
                    <option value="Caracas">Caracas</option>
                    <option value="Guarenas">Guarenas</option>
                    <option value="Guatire">Guatire</option>
                    <option value="Envíos Nacionales (Cobro en Destino)">Envíos Nacionales (Cobro en Destino Tealca / Zoom)</option>
                    <option value="Retiro en Almacén">Retiro en Almacén</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago</label>
                  <select
                    value={manualMetodo}
                    onChange={(e) => setManualMetodo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-emerald-600"
                  >
                    <option value="Pago Móvil / Transferencia Bs (Tasa BCV)">
                      Pago Móvil / Transferencia Bs (Tasa BCV)
                    </option>
                    <option value="Dólares en Efectivo">Dólares en Efectivo</option>
                    <option value="Binance USDT">Binance USDT</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dirección de Despacho</label>
                  <input
                    type="text"
                    value={manualDireccion}
                    onChange={(e) => setManualDireccion(e.target.value)}
                    placeholder="Calle, local, punto de referencia"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* SELECTOR DE PRODUCTOS DEL CATÁLOGO */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-800" />
                  <span>Agregar Productos al Pedido</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Producto</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="">Selecciona un producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (SKU: {p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Variante / Color</label>
                    <select
                      value={selectedVariantSku}
                      onChange={(e) => {
                        setSelectedVariantSku(e.target.value);
                        const minUnits =
                          selectedTarifa === "gran_mayor"
                            ? selectedProduct?.variantes?.find((v) => v.sku === e.target.value)?.minGranMayor || selectedProduct?.minGranMayor || 100
                            : selectedProduct?.variantes?.find((v) => v.sku === e.target.value)?.minMayor || selectedProduct?.minMayor || 50;
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tarifa</label>
                    <select
                      value={selectedTarifa}
                      onChange={(e) => handleChangeTarifa(e.target.value as "mayor" | "gran_mayor")}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="mayor">Mayor</option>
                      <option value="gran_mayor">Gran Mayor</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Cantidad ({selectedProduct ? `Mínimo ${currentStep} unds · Suma de ${currentStep} en ${currentStep}` : "Unidades"})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(selectedCantidad, 10) || currentStep;
                          const next = Math.max(currentStep, cur - currentStep);
                          setSelectedCantidad(String(next));
                        }}
                        className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-base transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={currentStep}
                        step={currentStep}
                        value={selectedCantidad}
                        onChange={(e) => setSelectedCantidad(e.target.value)}
                        className="w-24 h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-center focus:outline-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(selectedCantidad, 10) || currentStep;
                          setSelectedCantidad(String(cur + currentStep));
                        }}
                        className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-base transition-colors"
                      >
                        +
                      </button>
                      <span className="text-xs font-bold text-slate-600 ml-1">unds</span>

                      {selectedProduct && (
                        <span className="text-xs font-black text-emerald-800 bg-emerald-100/70 border border-emerald-300 rounded-xl px-2.5 py-1.5 ml-2 shadow-2xs">
                          = {formatUsd(
                            Math.round(
                              ((selectedTarifa === "gran_mayor"
                                ? selectedVariant?.precioGranMayorUsd || selectedProduct.precioGranMayorUsd || 0
                                : selectedVariant?.precioMayorUsd || selectedProduct.precioMayorUsd || 0) *
                                ((parseInt(selectedCantidad, 10) || currentStep) / currentStep)) *
                                100
                            ) / 100
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddProductToManual}
                    disabled={!selectedProduct}
                    className="h-9 px-5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar Producto</span>
                  </button>
                </div>

                {/* Lista de productos agregados */}
                {manualItems.length > 0 && (
                  <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200 pt-2 space-y-2">
                    {manualItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between pt-1.5 text-xs">
                        <div>
                          <p className="font-bold text-slate-900">
                            {item.nombre} {item.color ? `(${item.color})` : ""}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.cantidad} unds ({item.tarifa === "gran_mayor" ? "Gran Mayor" : "Mayor"}) · Costo total: {formatUsd(item.costoTotalUsd)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900">{formatUsd(item.subtotalUsd)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveManualItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GESTIÓN FISCAL (CON IVA VS SIN IVA) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Régimen Fiscal de la Operación (IVA / Facturación)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setManualConIva(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      !manualConIva
                        ? "bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Sin IVA / Nota de Entrega
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                        100% Ganancia
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Comercio mayorista sin factura fiscal. No se retiene impuesto SENIAT; el margen se computa 100% como utilidad neta para tu empresa.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualConIva(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      manualConIva
                        ? "bg-blue-50/90 border-blue-500 ring-1 ring-blue-500/30 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Con IVA / Factura Fiscal (16%)
                      </span>
                      <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                        Aparta SENIAT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      El cliente exige factura formal. El 16% de IVA se aparta a la reserva SENIAT y no se contabiliza en tu ganancia neta.
                    </p>
                  </button>
                </div>
              </div>

              {/* ASIGNACIÓN DE GASTOS LOGÍSTICOS DEL VIAJE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-amber-950">
                      Flete de Retiro al Proveedor (Asignado a este Pedido)
                    </label>
                    {ordersTodayCount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ⚡ {ordersTodayCount} pedido(s) ya hoy
                      </span>
                    )}
                  </div>
                  <select
                    value={manualFleteOpcion}
                    onChange={(e) => setManualFleteOpcion(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-900"
                  >
                    <option value="5.00">Viaje individual exclusivo: $5.00</option>
                    <option value="2.50">Agrupado con 2 pedidos hoy: $2.50</option>
                    <option value="1.67">Agrupado con 3 pedidos hoy: $1.67</option>
                    <option value="1.25">Agrupado con 4 pedidos hoy: $1.25</option>
                    <option value="1.00">Agrupado con 5 pedidos hoy (Meta): $1.00</option>
                    <option value="0.00">Sin gasto de flete (Stock ya en almacén): $0.00</option>
                  </select>
                  <p className="text-[10px] text-amber-800 mt-1">
                    {ordersTodayCount > 0
                      ? `¡Hoy ya tienes ${ordersTodayCount} pedido(s)! Si este pedido va en el mismo viaje al proveedor, el flete de $5 se comparte ($${(5.0 / (ordersTodayCount + 1)).toFixed(2)} c/u).`
                      : "El costo del viaje al proveedor son $5. Si agrupas pedidos el mismo día, se divide entre ellos."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Gasto de Embalaje</label>
                  <input
                    type="number"
                    step="0.05"
                    value={manualEmbalaje}
                    onChange={(e) => setManualEmbalaje(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-900"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">Caja, cinta, etiquetas y bolsa ($0.50 por pedido).</p>
                </div>
              </div>

              {/* RESUMEN TOTAL Y BOTÓN DE ACCIÓN */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total a Cobrar al Cliente</p>
                  <p className="text-2xl font-black text-emerald-400">{formatUsd(manualTotalUsd)}</p>
                  <p className="text-xs text-slate-300">
                    ≈ {formatVes(calculateVesTotal(manualTotalUsd, bcvRate))} (Tasa BCV {bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })})
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submittingManual}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>{submittingManual ? "Registrando..." : "Guardar y Abrir WhatsApp"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Icono auxiliar de Target / Objetivo
function TargetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
