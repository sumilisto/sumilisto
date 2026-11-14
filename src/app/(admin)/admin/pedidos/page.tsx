"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import { formatUsd, formatVes, calculateVesTotal, normalizeWhatsAppPhone } from "@/lib/currency/format";
import { resolveWholesaleLine } from "@/lib/pricing/pricing";
import { Order, OrderItem, OrderStatus } from "@/types/order";
import { Product } from "@/types/product";
import { AdminNav } from "@/components/admin/AdminNav";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  X,
  Lock,
  User,
  AlertCircle,
  MapPin,
  ClipboardList,
  Printer,
  CheckSquare,
  Square,
  Send,
  Calendar,
  DollarSign,
  Info,
} from "lucide-react";

export default function AdminPedidosPage() {
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
  const [filterOrigen, setFilterOrigen] = useState<"todos" | "web" | "manual">("todos");

  // Reloj en tiempo real para el temporizador de 2 minutos en pedidos cancelados
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Modal de Detallado / Picking (Hoja de Armado)
  const [selectedOrderForPicking, setSelectedOrderForPicking] = useState<Order | null>(null);
  const [packedItemsMap, setPackedItemsMap] = useState<Record<string, Record<number, boolean>>>({});

  // Modal de Pedido Manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Formulario de Pedido Manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualTelefono, setManualTelefono] = useState("");
  const [manualZona, setManualZona] = useState("");
  const [manualDireccion, setManualDireccion] = useState("");
  const [manualMetodoPago, setManualMetodoPago] = useState("Pago Móvil / Transferencia Bs (Tasa BCV)");
  const [manualNotas, setManualNotas] = useState("");
  const [manualFleteRetiro, setManualFleteRetiro] = useState(5.0);
  const [manualEmbalaje, setManualEmbalaje] = useState(0.5);
  const [manualItems, setManualItems] = useState<
    Array<{
      productoId: string;
      sku: string;
      nombre: string;
      presentacion?: string;
      color?: string;
      cantidad: number;
      tarifa: "mayor" | "gran_mayor";
      precioPaquete: number;
      costoPaquete: number;
      subtotalUsd: number;
      costoTotalUsd: number;
    }>
  >([]);

  // Estados del selector inteligente de producto en modal manual
  const [selectedProdId, setSelectedProdId] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [selectedVariantSku, setSelectedVariantSku] = useState("");
  const [selectedTarifa, setSelectedTarifa] = useState<"mayor" | "gran_mayor">("mayor");
  const [selectedCantidad, setSelectedCantidad] = useState("50");

  const productSearchContainerRef = useRef<HTMLDivElement>(null);

  // 1. Verificación de autenticación
  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const res = await loginAdmin(usernameInput, passwordInput);
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setAuthError(res.error || "Credenciales incorrectas");
      }
    } catch {
      setAuthError("Error de conexión al autenticar");
    } finally {
      setLoggingIn(false);
    }
  };

  // 2. Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, bcvRes, prodRes] = await Promise.all([
        fetch("/api/orders").then((r) => r.json()),
        fetch("/api/bcv").then((r) => r.json()).catch(() => ({ rate: 880.12 })),
        fetch("/api/products").then((r) => r.json()).catch(() => []),
      ]);

      if (ordersRes.ok && Array.isArray(ordersRes.orders)) {
        setOrders(ordersRes.orders);
      }
      if (bcvRes?.rate) {
        setBcvRate(Number(bcvRes.rate) || 880.12);
      }
      const productList: Product[] = Array.isArray(prodRes)
        ? prodRes
        : Array.isArray(prodRes?.products)
          ? prodRes.products
          : [];

      if (productList.length > 0) {
        setProducts(productList);
        if (!selectedProdId) {
          const firstP = productList[0];
          setSelectedProdId(firstP.id || firstP.sku);
          setProductSearchQuery(firstP.nombre || "");
          setSelectedVariantSku(firstP.variantes?.[0]?.sku || firstP.sku || "");
          setSelectedCantidad(String(firstP.minMayor || 50));
        }
      }
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // 3. Temporizador de 1 segundo para la cuenta regresiva de 2 minutos en pedidos cancelados
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      // Limpieza automática en cliente si expiraron los 2 minutos (120,000 ms)
      setOrders((prev) => {
        let changed = false;
        const next = prev.filter((ord) => {
          if (ord.estado === "cancelado" && ord.cancelledAt) {
            const elapsed = now - new Date(ord.cancelledAt).getTime();
            if (elapsed >= 120000) {
              changed = true;
              // Llamar a DELETE en segundo plano para limpiar permanentemente y liberar el #SUMI-XXXX
              fetch(`/api/orders?id=${ord.id}`, { method: "DELETE" }).catch(() => { });
              return false;
            }
          }
          return true;
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 4. Cambiar estado de un pedido (con regla de 2 minutos para cancelados)
  const handleUpdateStatus = async (orderId: string, nuevoEstado: OrderStatus) => {
    const prevOrders = [...orders];
    const nowIso = new Date().toISOString();

    // Actualización optimista instantánea
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated: Order = { ...o, estado: nuevoEstado, updatedAt: nowIso };
          if (nuevoEstado === "cancelado") {
            updated.cancelledAt = nowIso;
          } else {
            delete updated.cancelledAt;
          }
          return updated;
        }
        return o;
      })
    );

    if (selectedOrderForPicking && selectedOrderForPicking.id === orderId) {
      setSelectedOrderForPicking((prev) => {
        if (!prev) return null;
        const updated = { ...prev, estado: nuevoEstado };
        if (nuevoEstado === "cancelado") updated.cancelledAt = nowIso;
        else delete updated.cancelledAt;
        return updated;
      });
    }

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOrders(prevOrders);
      }
    } catch {
      setOrders(prevOrders);
    }
  };

  // Restaurar un pedido cancelado antes de que expiren los 2 minutos
  const handleRestoreCancelledOrder = (orderId: string) => {
    handleUpdateStatus(orderId, "pendiente");
  };

  // Eliminar inmediatamente sin esperar los 2 minutos
  const handleForceDeleteOrder = async (orderId: string) => {
    if (!confirm("¿Eliminar este pedido inmediatamente y liberar su código #SUMI ahora?")) return;
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (selectedOrderForPicking?.id === orderId) setSelectedOrderForPicking(null);
    try {
      await fetch(`/api/orders?id=${orderId}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Gestión del checklist de armado (Picking)
  const toggleItemPacked = (orderId: string, itemIdx: number) => {
    setPackedItemsMap((prev) => {
      const currentOrderMap = prev[orderId] || {};
      const isPacked = !currentOrderMap[itemIdx];
      return {
        ...prev,
        [orderId]: {
          ...currentOrderMap,
          [itemIdx]: isPacked,
        },
      };
    });
  };

  // 6. Buscador y Filtros
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterEstado !== "todos" && o.estado !== filterEstado) return false;
      if (filterOrigen !== "todos" && o.origen !== filterOrigen) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCodigo = o.codigo?.toLowerCase().includes(q);
        const matchCliente = o.clienteNombre?.toLowerCase().includes(q);
        const matchTel = o.clienteTelefono?.toLowerCase().includes(q);
        const matchZona = o.zonaEntrega?.toLowerCase().includes(q);
        const matchDir = o.direccion?.toLowerCase().includes(q);
        if (!matchCodigo && !matchCliente && !matchTel && !matchZona && !matchDir) {
          return false;
        }
      }
      return true;
    });
  }, [orders, filterEstado, filterOrigen, searchTerm]);

  // Contadores por estado
  const statusCounts = useMemo(() => {
    const counts = {
      todos: orders.length,
      pendiente: 0,
      pagado: 0,
      despachado: 0,
      entregado: 0,
      cancelado: 0,
    };
    orders.forEach((o) => {
      if (counts[o.estado] !== undefined) counts[o.estado]++;
    });
    return counts;
  }, [orders]);

  // Selector inteligente de productos para el modal manual
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

  const handleOpenManualModal = async () => {
    setIsModalOpen(true);
    let list = products;
    if (list.length === 0) {
      try {
        const prodRes = await fetch("/api/products").then((r) => r.json());
        list = Array.isArray(prodRes) ? prodRes : prodRes?.products || [];
        if (list.length > 0) {
          setProducts(list);
        }
      } catch (err) {
        console.error("Error cargando productos al abrir modal:", err);
      }
    }
    if (list.length > 0 && !selectedProdId) {
      const firstP = list[0];
      setSelectedProdId(firstP.id || firstP.sku);
      setProductSearchQuery(firstP.nombre || "");
      setSelectedVariantSku(firstP.variantes?.[0]?.sku || firstP.sku || "");
      setSelectedTarifa("mayor");
      setSelectedCantidad(String(firstP.variantes?.[0]?.minMayor || firstP.minMayor || 50));
    }
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

  const handleAddProductToManual = () => {
    if (!selectedProduct) return;

    let parsedCantidad = parseInt(selectedCantidad, 10) || currentStep;
    if (parsedCantidad < currentStep) parsedCantidad = currentStep;
    const remainder = parsedCantidad % currentStep;
    if (remainder !== 0) parsedCantidad += currentStep - remainder;

    const resolved = resolveWholesaleLine(selectedProduct, selectedVariant, parsedCantidad);

    setManualItems((prev) => [
      ...prev,
      {
        productoId: selectedProduct.id || selectedProduct.sku || "",
        sku: selectedVariant?.sku || selectedProduct.sku,
        nombre: selectedProduct.nombre,
        presentacion: selectedVariant?.presentacion || selectedProduct.presentacion || undefined,
        color: selectedVariant?.color || undefined,
        cantidad: parsedCantidad,
        unidadesPorPaquete: resolved.unidadesPorPaquete,
        tarifa: resolved.tarifa,
        precioPaquete: resolved.precioPaquete,
        costoPaquete: resolved.costoPaquete,
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

  const handleRemoveManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNombre.trim() || !manualTelefono.trim()) {
      alert("Por favor ingresa el nombre y teléfono del cliente");
      return;
    }
    if (manualItems.length === 0) {
      alert("Agrega al menos un producto al pedido");
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
          metodoPago: manualMetodoPago,
          notas: manualNotas,
          items: manualItems,
          gastoFleteRetiroUsd: manualFleteRetiro,
          gastoEmbalajeUsd: manualEmbalaje,
          tasaBcv: bcvRate,
        }),
      });

      const data = await res.json();
      if (data.ok && data.order) {
        setOrders((prev) => [data.order, ...prev]);
        setIsModalOpen(false);
        setManualNombre("");
        setManualTelefono("");
        setManualZona("");
        setManualDireccion("");
        setManualNotas("");
        setManualItems([]);

        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, "_blank");
        }
      } else {
        alert(data.error || "No se pudo guardar el pedido");
      }
    } catch {
      alert("Error de conexión al guardar el pedido");
    } finally {
      setSubmittingManual(false);
    }
  };

  // Renderizar pantalla de autenticación si no está logueado
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-emerald-800 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 w-full max-w-md">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-center text-slate-900 mb-1">Acceso Administrativo</h1>
          <p className="text-xs text-center text-slate-500 mb-6">Inicia sesión para gestionar pedidos y despacho</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-600"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-600"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 bg-emerald-800 text-white rounded-xl font-bold text-sm hover:bg-emerald-900 transition-colors shadow-md disabled:opacity-50"
            >
              {loggingIn ? "Verificando..." : "Entrar al Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <AdminNav onLogout={() => setIsAuthenticated(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ENCABEZADO Y ACCIONES PRINCIPALES */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <ClipboardList className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Control de Pedidos y Despacho</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seguimiento de pedidos, picking de almacén, hojas de armado y cambios de estado en vivo.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refrescar pedidos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>

            <Link
              href="/admin/contabilidad"
              className="px-3.5 py-2 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl border border-purple-200 flex items-center gap-1.5 transition-all"
            >
              <DollarSign className="w-3.5 h-3.5 text-purple-700" />
              <span>Ver Contabilidad y Finanzas</span>
            </Link>

            <button
              onClick={handleOpenManualModal}
              className="px-4 py-2 text-xs font-black bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Montar Pedido Manual</span>
            </button>
          </div>
        </div>

        {/* PESTAÑAS DE FILTRO RÁPIDO POR ESTADO (KPIS CLICKEABLES) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: "todos", label: "Todos", count: statusCounts.todos, color: "slate", icon: Package },
            { id: "pendiente", label: "Pendientes", count: statusCounts.pendiente, color: "amber", icon: Clock },
            { id: "pagado", label: "Pagados", count: statusCounts.pagado, color: "blue", icon: DollarSign },
            { id: "despachado", label: "Despachados", count: statusCounts.despachado, color: "purple", icon: Truck },
            { id: "entregado", label: "Entregados", count: statusCounts.entregado, color: "emerald", icon: CheckCircle2 },
            { id: "cancelado", label: "Cancelados", count: statusCounts.cancelado, color: "rose", icon: RotateCcw },
          ].map((tab) => {
            const isActive = filterEstado === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterEstado(tab.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                    {tab.label}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black">{tab.count}</span>
                  {tab.id === "cancelado" && tab.count > 0 && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-200 font-bold px-1.5 py-0.5 rounded">
                      Papelera 2m
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS ADICIONALES */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por #SUMI, cliente, teléfono, dirección..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Origen:</span>
            <select
              value={filterOrigen}
              onChange={(e) => setFilterOrigen(e.target.value as any)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 outline-none"
            >
              <option value="todos">Todos los Orígenes</option>
              <option value="web">Solo Tienda Web</option>
              <option value="manual">Solo Manuales</option>
            </select>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE PEDIDOS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Package className="w-14 h-14 mx-auto text-slate-300 mb-3" />
                <p className="text-base font-bold text-slate-700">No hay pedidos que coincidan con los filtros</p>
                <p className="text-xs text-slate-400 mt-1">Prueba cambiando el estado o el término de búsqueda.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Código / Origen</th>
                    <th className="py-3.5 px-4">Cliente / Contacto</th>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Artículos</th>
                    <th className="py-3.5 px-4">Total USD / Bs</th>
                    <th className="py-3.5 px-4">Estado del Pedido</th>
                    <th className="py-3.5 px-4 text-center">Hoja de Armado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredOrders.map((ord) => {
                    const whatsappChatUrl = `https://wa.me/${normalizeWhatsAppPhone(ord.clienteTelefono)}`;

                    // Temporizador de 2 minutos para pedidos cancelados
                    const isCancelled = ord.estado === "cancelado";
                    let remainingSeconds = 0;
                    if (isCancelled && ord.cancelledAt) {
                      const elapsed = currentTime - new Date(ord.cancelledAt).getTime();
                      remainingSeconds = Math.max(0, Math.ceil((120000 - elapsed) / 1000));
                    }

                    const totalUnidades = (ord.items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0);
                    const totalArticulosCount = (ord.items || []).length;

                    // Progreso del picking
                    const orderPacked = packedItemsMap[ord.id] || {};
                    const packedCount = Object.values(orderPacked).filter(Boolean).length;
                    const isAllPacked = totalArticulosCount > 0 && packedCount === totalArticulosCount;

                    return (
                      <tr
                        key={ord.id}
                        className={`transition-colors ${isCancelled ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-slate-50/80"
                          }`}
                      >
                        {/* CÓDIGO */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono">
                              {ord.codigo}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${ord.origen === "web"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                                }`}
                            >
                              {ord.origen === "web" ? "Web" : "Manual"}
                            </span>
                          </div>
                        </td>

                        {/* CLIENTE */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{ord.clienteNombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <a
                              href={whatsappChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                            >
                              <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                              <span className="text-[11px]">{ord.clienteTelefono}</span>
                            </a>
                            {ord.zonaEntrega && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                · {ord.zonaEntrega}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* FECHA */}
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                          {new Date(ord.createdAt).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* ARTÍCULOS */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900 text-xs">
                            {totalUnidades} unds
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {totalArticulosCount} {totalArticulosCount === 1 ? "artículo" : "artículos"}
                          </p>
                        </td>

                        {/* TOTAL */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-extrabold text-slate-900 text-sm">{formatUsd(ord.totalUsd)}</p>
                          <p className="text-[10px] text-slate-400">
                            {formatVes(ord.totalVes || calculateVesTotal(ord.totalUsd, ord.tasaBcv || bcvRate))}
                          </p>
                        </td>

                        {/* ESTADO CON TEMPORIZADOR DE 2 MIN */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <select
                              value={ord.estado}
                              onChange={(e) => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                              className={`text-xs font-bold px-2.5 py-1 rounded-xl border outline-none cursor-pointer transition-colors ${ord.estado === "entregado"
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
                              <option value="pendiente">🕒 Pendiente</option>
                              <option value="pagado">💳 Pagado</option>
                              <option value="despachado">🚚 Despachado</option>
                              <option value="entregado">✅ Entregado</option>
                              <option value="cancelado">❌ Cancelado</option>
                            </select>

                            {/* Alerta de eliminación automática a los 2 minutos */}
                            {isCancelled && (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                  <span>⏳</span>
                                  <span>
                                    Borrado en {Math.floor(remainingSeconds / 60)}:
                                    {(remainingSeconds % 60).toString().padStart(2, "0")}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreCancelledOrder(ord.id)}
                                  className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                                  title="Restaurar pedido a Pendiente"
                                >
                                  Deshacer
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* HOJA DE ARMADO / PICKING STATUS */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForPicking(ord)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${isAllPacked
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : packedCount > 0
                                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                                  : "bg-slate-900 hover:bg-emerald-800 text-white"
                              }`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>
                              {isAllPacked
                                ? "¡Listo para Enviar!"
                                : packedCount > 0
                                  ? `Armando (${packedCount}/${totalArticulosCount})`
                                  : "📦 Armar Pedido"}
                            </span>
                          </button>
                        </td>

                        {/* ACCIONES */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={whatsappChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-all text-xs"
                              title="Abrir chat de WhatsApp con el cliente"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            {isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleForceDeleteOrder(ord.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar inmediatamente y liberar código"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 1: HOJA DE ARMADO Y DESPACHO (PICKING CHECKLIST) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {selectedOrderForPicking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 font-mono">
                      {selectedOrderForPicking.codigo}
                    </h3>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${selectedOrderForPicking.origen === "web"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                        }`}
                    >
                      {selectedOrderForPicking.origen === "web" ? "Tienda Web" : "Carga Manual"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hoja de Picking y Armado para Despacho en Bodega
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir hoja de armado para bodega"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPicking(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Tarjeta de Datos del Cliente y Despacho */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Cliente y Contacto</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{selectedOrderForPicking.clienteNombre}</p>
                  <a
                    href={`https://wa.me/${normalizeWhatsAppPhone(selectedOrderForPicking.clienteTelefono)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold mt-1"
                    title="Chatear con el cliente"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedOrderForPicking.clienteTelefono} (Abrir Chat)</span>
                  </a>
                  <p className="text-slate-500 mt-1">
                    <span className="font-bold text-slate-700">Método de Pago:</span> {selectedOrderForPicking.metodoPago}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Destino y Entrega</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedOrderForPicking.zonaEntrega || "Sin zona especificada"}
                  </p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    {selectedOrderForPicking.direccion || "Sin dirección exacta"}
                  </p>

                  {/* Banner de Modalidad de Despacho */}
                  <div className="mt-2">
                    {selectedOrderForPicking.zonaEntrega?.toLowerCase().includes("nacional") ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 font-bold text-[11px]">
                        📦 Envíos Nacionales: Cobro en Destino (MRW / Zoom / Tealca)
                      </span>
                    ) : selectedOrderForPicking.totalUsd >= 50 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 font-bold text-[11px]">
                        🛵 ¡DELIVERY GRATIS APLICADO! (Compra mayor a $50)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 font-bold text-[11px]">
                        🚚 Tarifa acordada con el asesor
                      </span>
                    )}
                  </div>
                </div>

                {selectedOrderForPicking.notas && (
                  <div className="sm:col-span-2 bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-amber-900">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Notas del Cliente / Instrucciones:
                    </p>
                    <p className="mt-0.5 text-xs font-medium">{selectedOrderForPicking.notas}</p>
                  </div>
                )}
              </div>

              {/* BARRA DE PROGRESO DEL ARMADO */}
              {(() => {
                const orderPacked = packedItemsMap[selectedOrderForPicking.id] || {};
                const totalItems = (selectedOrderForPicking.items || []).length;
                const packedCount = Object.values(orderPacked).filter(Boolean).length;
                const progressPct = totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

                return (
                  <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-black text-slate-900 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                        <span>Checklist de Artículos Empacados</span>
                      </span>
                      <span className="font-extrabold text-emerald-800">
                        {packedCount} de {totalItems} artículos ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* LISTA INTERACTIVA DE ARTÍCULOS PARA ARMAR EL PAQUETE */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Artículos a Empacar (Marca cada casilla al meterlo en la caja)
                </h4>

                <div className="space-y-2">
                  {(selectedOrderForPicking.items || []).map((it, idx) => {
                    const isPacked = packedItemsMap[selectedOrderForPicking.id]?.[idx] || false;
                    const tarifaDesc = it.tarifa === "gran_mayor" ? "Gran Mayor" : "Mayor";

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleItemPacked(selectedOrderForPicking.id, idx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isPacked
                            ? "bg-emerald-50/70 border-emerald-300 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isPacked
                                ? "bg-emerald-600 text-white"
                                : "border-2 border-slate-300 hover:border-slate-400 text-transparent"
                              }`}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>

                          <div className="min-w-0">
                            <p
                              className={`text-xs font-black leading-tight ${isPacked ? "line-through text-slate-400" : "text-slate-900"
                                }`}
                            >
                              {it.nombre}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              {(it.presentacion || it.color) && (
                                <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {it.presentacion || it.color}
                                </span>
                              )}
                              <span>Tarifa {tarifaDesc}</span>
                              <span className="font-mono text-slate-400">SKU: {it.sku}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm font-black px-2.5 py-1 rounded-xl block ${isPacked
                                ? "bg-emerald-100 text-emerald-950"
                                : "bg-amber-100 text-amber-950 font-black"
                              }`}
                          >
                            {it.cantidad} unds
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                            {formatUsd(it.subtotalUsd)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TOTAL A COBRAR / PAGADO */}
              <div className="bg-emerald-900 text-white rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-200 tracking-wider">Total del Pedido</p>
                  <p className="text-2xl font-black">{formatUsd(selectedOrderForPicking.totalUsd)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-emerald-200 tracking-wider">Total en Bolívares</p>
                  <p className="text-base font-extrabold text-emerald-100">
                    {formatVes(
                      selectedOrderForPicking.totalVes ||
                      calculateVesTotal(
                        selectedOrderForPicking.totalUsd,
                        selectedOrderForPicking.tasaBcv || bcvRate
                      )
                    )}
                  </p>
                  <p className="text-[10px] text-emerald-300">
                    Tasa BCV: Bs. {(selectedOrderForPicking.tasaBcv || bcvRate).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal con Acciones de Estado Rápido */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500">Cambiar estado:</span>
                <select
                  value={selectedOrderForPicking.estado}
                  onChange={(e) => handleUpdateStatus(selectedOrderForPicking.id, e.target.value as OrderStatus)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white cursor-pointer"
                >
                  <option value="pendiente">🕒 Pendiente</option>
                  <option value="pagado">💳 Pagado</option>
                  <option value="despachado">🚚 Despachado</option>
                  <option value="entregado">✅ Entregado</option>
                  <option value="cancelado">❌ Cancelado (2 min)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {selectedOrderForPicking.estado !== "despachado" && selectedOrderForPicking.estado !== "entregado" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrderForPicking.id, "despachado")}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Marcar como Despachado</span>
                  </button>
                )}

                {selectedOrderForPicking.estado === "despachado" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrderForPicking.id, "entregado")}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar como Entregado</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrderForPicking(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CREACIÓN MANUAL DE PEDIDO */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-700" />
                  <span>Montar Pedido Manual</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registra un pedido cerrado por WhatsApp. Se asignará un código único #SUMI-XXXX.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-6">
              {/* Datos del Cliente */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-500 mb-3 tracking-wider">
                  1. Datos del Cliente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre o Razón Social *</label>
                    <input
                      type="text"
                      required
                      value={manualNombre}
                      onChange={(e) => setManualNombre(e.target.value)}
                      placeholder="Ej: Osma Bakery"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={manualTelefono}
                      onChange={(e) => setManualTelefono(e.target.value)}
                      placeholder="Ej: 04227864547"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Zona de Entrega</label>
                    <input
                      type="text"
                      value={manualZona}
                      onChange={(e) => setManualZona(e.target.value)}
                      placeholder="Ej: Envíos Nacionales (Cobro en Destino) o Guatire"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dirección / Agencia</label>
                    <input
                      type="text"
                      value={manualDireccion}
                      onChange={(e) => setManualDireccion(e.target.value)}
                      placeholder="Ej: MRW 07110 o Calle Principal"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago Acordado</label>
                    <input
                      type="text"
                      value={manualMetodoPago}
                      onChange={(e) => setManualMetodoPago(e.target.value)}
                      placeholder="Ej: Pago Móvil / Transferencia Bs (Tasa BCV)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Agregar Productos con Buscador Inteligente */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-500 mb-3 tracking-wider">
                  2. Agregar Productos al Pedido
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Buscador inteligente */}
                    <div className="sm:col-span-2 relative" ref={productSearchContainerRef}>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Buscar Producto
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
                          placeholder="Buscar producto o SKU (haz clic para desplegar)..."
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

                      {/* Dropdown flotante */}
                      {isProductSearchOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsProductSearchOpen(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-60 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 divide-y divide-slate-100">
                            {products.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-500">
                                Cargando catálogo de productos...
                              </div>
                            ) : searchFilteredProducts.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-500">
                                <p className="font-bold">No se encontraron productos coincidentes</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Intenta con otro término o código SKU</p>
                              </div>
                            ) : (
                              searchFilteredProducts.map((p) => {
                                const isSelected = p.id === selectedProdId;
                                return (
                                  <button
                                    key={p.id || p.sku}
                                    type="button"
                                    onClick={() => handleSelectProduct(p.id || p.sku || "")}
                                    className={`w-full text-left p-2.5 transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${isSelected ? "bg-emerald-50 text-emerald-950 font-bold" : "hover:bg-slate-50 text-slate-800"
                                      }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold truncate">{p.nombre}</p>
                                      <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-[11px] font-black text-emerald-800">
                                        {formatUsd(p.precioMayorUsd || 0)}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Variante / Color</label>
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tarifa</label>
                      <select
                        value={selectedTarifa}
                        onChange={(e) => handleChangeTarifa(e.target.value as "mayor" | "gran_mayor")}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="mayor">Mayor</option>
                        <option value="gran_mayor" disabled={Boolean(selectedProduct) && !previewPricing.hasGranMayor}>
                          Gran Mayor{selectedProduct && previewPricing.hasGranMayor ? ` (Mín. ${previewPricing.minGranMayor})` : ""}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Cantidad con saltos mínimos según empaque */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Cantidad ({selectedProduct ? `Mínimo ${currentStep} unds · Suma de ${currentStep} en ${currentStep}` : "Unidades"})
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(selectedCantidad, 10) || currentStep;
                            const next = Math.max(currentStep, cur - currentStep);
                            syncCantidadAndTarifa(next);
                          }}
                          className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-base"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={currentStep}
                          step={currentStep}
                          value={selectedCantidad}
                          onChange={(e) => syncCantidadAndTarifa(e.target.value)}
                          onBlur={() => {
                            let val = parseInt(selectedCantidad, 10) || currentStep;
                            if (val < currentStep) val = currentStep;
                            const rem = val % currentStep;
                            if (rem !== 0) val += currentStep - rem;
                            syncCantidadAndTarifa(val);
                          }}
                          className="w-20 h-9 px-2 text-center bg-white border border-slate-200 rounded-xl text-xs font-black"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(selectedCantidad, 10) || currentStep;
                            syncCantidadAndTarifa(cur + currentStep);
                          }}
                          className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-base"
                        >
                          +
                        </button>
                        <span className="text-xs font-bold text-slate-500 ml-1">unds</span>

                        {selectedProduct && (
                          <span
                            className={`ml-2 text-xs font-black px-2.5 py-1.5 rounded-xl border ${previewPricing.tarifa === "gran_mayor"
                                ? "text-amber-900 bg-amber-100/80 border-amber-300"
                                : "text-emerald-800 bg-emerald-50 border-emerald-200"
                              }`}
                          >
                            = {formatUsd(previewPricing.subtotalUsd)}{" "}
                            <span className="text-[10px] font-bold opacity-80">
                              ({previewPricing.tarifa === "gran_mayor" ? "Gran Mayor" : "Mayor"})
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddProductToManual}
                      disabled={!selectedProduct}
                      className="h-9 px-5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Producto</span>
                    </button>
                  </div>

                  {/* Lista de productos agregados */}
                  {manualItems.length > 0 && (
                    <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200 pt-2 space-y-2">
                      {manualItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between pt-1.5 text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{item.nombre}</span>
                            <span className="text-slate-500 text-[10px] ml-1">
                              ({item.presentacion || item.color || "Estándar"} · {item.tarifa === "gran_mayor" ? "Gran Mayor" : "Mayor"})
                            </span>
                            <span className="text-slate-400 text-[10px] block">
                              {item.cantidad} unds = {formatUsd(item.subtotalUsd)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveManualItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones / Notas</label>
                <textarea
                  rows={2}
                  value={manualNotas}
                  onChange={(e) => setManualNotas(e.target.value)}
                  placeholder="Detalles sobre despacho, horario de entrega, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingManual || manualItems.length === 0}
                  className="px-6 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-black hover:bg-emerald-900 disabled:opacity-50 transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  {submittingManual ? "Guardando Pedido..." : "Guardar y Enviar Resumen WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
