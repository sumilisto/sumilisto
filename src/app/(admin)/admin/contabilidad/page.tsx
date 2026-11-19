"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { formatUsd, formatVes, calculateVesTotal, normalizeWhatsAppPhone } from "@/lib/currency/format";
import { Order, OrderStatus } from "@/types/order";
import { Product } from "@/types/product";
import { Expense, UsdtTransaction, UsdtRates, DEFAULT_USDT_RATES } from "@/types/accounting";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";
import { ExpenseModal } from "@/components/admin/accounting/ExpenseModal";
import { UsdtModal } from "@/components/admin/accounting/UsdtModal";
import { UsdtRatesModal } from "@/components/admin/accounting/UsdtRatesModal";
import { UsdtTable } from "@/components/admin/accounting/UsdtTable";
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  RefreshCw,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Trash2,
  FileText,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
} from "lucide-react";

interface MovimientoContable {
  id: string;
  fecha: string;
  tipo: "haber" | "debe"; // haber = entrada, debe = salida
  categoria: string;
  concepto: string;
  clienteTelefono?: string;
  metodoPago?: "bolivares" | "dolares_efectivo" | "usdt" | string;
  metodoDesc: string;
  referencia?: string;
  monto: number;
  orderId?: string;
  order?: Order;
  expense?: Expense;
}

export default function AdminContabilidadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bcvRate, setBcvRate] = useState<number>(880.12);

  // Filtros y Período
  const [activeTab, setActiveTab] = useState<"debe_haber" | "usdt" | "pedidos">("debe_haber");
  const [tipoMovimientoFilter, setTipoMovimientoFilter] = useState<"todos" | "haber" | "debe" | "pendientes">("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<"mes" | "todo">("mes");

  // Estado de Gastos y Tesorería USDT
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [usdtTransactions, setUsdtTransactions] = useState<UsdtTransaction[]>([]);
  const [usdtRates, setUsdtRates] = useState<UsdtRates>(DEFAULT_USDT_RATES);

  // Modales
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showUsdtModal, setShowUsdtModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [editingPaymentOrder, setEditingPaymentOrder] = useState<Order | null>(null);
  const [paymentEditTipo, setPaymentEditTipo] = useState<"bolivares" | "dolares_efectivo" | "usdt">("bolivares");
  const [paymentEditRef, setPaymentEditRef] = useState("");
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false);

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
      const [ordersRes, prodsRes, bcvRes, acctRes] = await Promise.all([
        fetch("/api/orders").then((r) => r.json()).catch(() => null),
        fetch("/api/products").then((r) => r.json()).catch(() => null),
        fetch("/api/bcv").then((r) => r.json()).catch(() => null),
        fetch("/api/accounting").then((r) => r.json()).catch(() => null),
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
      if (acctRes?.ok) {
        if (Array.isArray(acctRes.gastos)) setExpenses(acctRes.gastos);
        if (Array.isArray(acctRes.operacionesUsdt)) setUsdtTransactions(acctRes.operacionesUsdt);
        if (acctRes.tasasUsdt) setUsdtRates(acctRes.tasasUsdt);
      }
    } catch (err) {
      console.error("Error cargando datos contables:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronización automática de tasas cada 5 minutos
  useEffect(() => {
    if (!isAuthenticated) return;

    const autoSyncInterval = setInterval(async () => {
      try {
        const [bcvRes, acctRes] = await Promise.all([
          fetch("/api/bcv").then((r) => r.json()).catch(() => null),
          fetch("/api/accounting").then((r) => r.json()).catch(() => null),
        ]);
        if (bcvRes?.rate) setBcvRate(Number(bcvRes.rate));
        if (acctRes?.ok && acctRes.tasasUsdt) setUsdtRates(acctRes.tasasUsdt);
      } catch (e) {
        console.warn("Fallo sincronización periódica:", e);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(autoSyncInterval);
  }, [isAuthenticated]);

  // Filtrado de pedidos por período y búsqueda
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return orders.filter((ord) => {
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
        const matchesRef = ord.referenciaPago?.toLowerCase().includes(q);
        return matchesCode || matchesName || matchesPhone || matchesRef;
      }
      return true;
    });
  }, [orders, selectedRange, searchTerm]);

  // Filtrado de gastos por período y búsqueda
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter((e) => {
      if (selectedRange === "mes" && e.fecha) {
        const d = new Date(e.fecha + "T00:00:00");
        if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
          return false;
        }
      }
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase();
        const matchesDesc = e.concepto?.toLowerCase().includes(q) || e.notas?.toLowerCase().includes(q);
        const matchesCat = e.categoria?.toLowerCase().includes(q);
        return matchesDesc || matchesCat;
      }
      return true;
    });
  }, [expenses, selectedRange, searchTerm]);

  // Transacciones USDT filtradas
  const filteredUsdtTransactions = useMemo(() => {
    if (selectedRange === "todo") return usdtTransactions;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return usdtTransactions.filter((t) => {
      if (!t.fecha) return true;
      const d = new Date(t.fecha + "T00:00:00");
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [usdtTransactions, selectedRange]);

  // Pedidos pendientes por cobrar
  const pedidosPendientes = useMemo(() => {
    return filteredOrders.filter((o) => o.estado === "pendiente");
  }, [filteredOrders]);

  const totalPendientesUsd = useMemo(() => {
    return pedidosPendientes.reduce((acc, o) => acc + (o.totalUsd || 0), 0);
  }, [pedidosPendientes]);

  // Lista unificada de movimientos contables: DEBE Y HABER
  const movimientos = useMemo<MovimientoContable[]>(() => {
    const list: MovimientoContable[] = [];

    // 1. HABER: Cada pedido marcado como pagado, despachado o entregado
    filteredOrders.forEach((ord) => {
      if (ord.estado !== "cancelado" && ord.estado !== "pendiente") {
        const metodoDesc =
          ord.tipoPago === "usdt"
            ? "🪙 USDT (Binance)"
            : ord.tipoPago === "dolares_efectivo"
              ? "💵 $ Efectivo"
              : "🇻🇪 Bs (Pago Móvil / BCV)";

        list.push({
          id: `ord-${ord.id}`,
          fecha: ord.createdAt,
          tipo: "haber",
          categoria: ord.origen === "web" ? "Venta Tienda Web" : "Venta Manual",
          concepto: `Pedido ${ord.codigo} · ${ord.clienteNombre} (${ord.items?.length || 0} prod.)`,
          clienteTelefono: ord.clienteTelefono,
          metodoPago: ord.tipoPago || "bolivares",
          metodoDesc,
          referencia: ord.referenciaPago || undefined,
          monto: ord.totalUsd || 0,
          orderId: ord.id,
          order: ord,
        });
      }
    });

    // 2. DEBE: Gastos, compras y pagos registrados
    filteredExpenses.forEach((exp) => {
      const catLabel =
        exp.categoria === "inventario"
          ? "Compra Inventario"
          : exp.categoria === "flete"
            ? "Flete / Transporte"
            : exp.categoria === "meta_ads"
              ? "Publicidad Meta Ads"
              : exp.categoria === "servicios"
                ? "Servicios"
                : "Gasto Operativo";

      const metodoDesc =
        exp.metodoPago === "usdt"
          ? "🪙 USDT"
          : exp.metodoPago === "bs_pago_movil" || exp.metodoPago === "bs_transferencia"
            ? "🇻🇪 Bolívares"
            : "💵 $ Efectivo";

      list.push({
        id: `exp-${exp.id}`,
        fecha: exp.fecha ? `${exp.fecha}T12:00:00` : exp.createdAt || new Date().toISOString(),
        tipo: "debe",
        categoria: catLabel,
        concepto: exp.concepto || "Gasto registrado",
        metodoPago: exp.metodoPago,
        metodoDesc,
        referencia: exp.notas || undefined,
        monto: exp.montoUsd || 0,
        expense: exp,
      });
    });

    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [filteredOrders, filteredExpenses]);

  // Cálculos totales de DEBE, HABER y Balance de Caja
  const totales = useMemo(() => {
    let totalHaber = 0;
    let totalDebe = 0;

    let haberBs = 0;
    let debeBs = 0;

    let haberUsd = 0;
    let debeUsd = 0;

    let haberUsdt = 0;
    let debeUsdt = 0;

    movimientos.forEach((m) => {
      if (m.tipo === "haber") {
        totalHaber += m.monto;
        if (m.metodoPago === "usdt") haberUsdt += m.monto;
        else if (m.metodoPago === "dolares_efectivo") haberUsd += m.monto;
        else haberBs += m.monto;
      } else {
        totalDebe += m.monto;
        if (m.metodoPago === "usdt") debeUsdt += m.monto;
        else if (m.metodoPago === "usd_efectivo" || m.metodoPago === "dolares_efectivo") debeUsd += m.monto;
        else debeBs += m.monto;
      }
    });

    const saldoNeto = totalHaber - totalDebe;
    const saldoBs = haberBs - debeBs;
    const saldoUsd = haberUsd - debeUsd;
    const saldoUsdt = haberUsdt - debeUsdt;

    return {
      totalHaber: Math.round(totalHaber * 100) / 100,
      totalDebe: Math.round(totalDebe * 100) / 100,
      saldoNeto: Math.round(saldoNeto * 100) / 100,
      saldoBs: Math.round(saldoBs * 100) / 100,
      saldoBsVes: Math.round(saldoBs * bcvRate * 100) / 100,
      saldoUsd: Math.round(saldoUsd * 100) / 100,
      saldoUsdt: Math.round(saldoUsdt * 100) / 100,
      haberCount: movimientos.filter((m) => m.tipo === "haber").length,
      debeCount: movimientos.filter((m) => m.tipo === "debe").length,
    };
  }, [movimientos, bcvRate]);

  // Movimientos filtrados por la píldora seleccionada
  const movimientosVisibles = useMemo(() => {
    if (tipoMovimientoFilter === "haber") return movimientos.filter((m) => m.tipo === "haber");
    if (tipoMovimientoFilter === "debe") return movimientos.filter((m) => m.tipo === "debe");
    return movimientos;
  }, [movimientos, tipoMovimientoFilter]);

  // Marcar pedido pendiente como pagado directamente
  const handleMarkOrderPaid = async (orderId: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, estado: "pagado" }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, estado: "pagado", updatedAt: new Date().toISOString() } : o))
        );
      }
    } catch (e) {
      console.error("Error al marcar pedido como pagado:", e);
    }
  };

  // Guardar edición de método de pago y referencia de un pedido
  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentOrder) return;
    setSavingPaymentEdit(true);

    try {
      const cleanRef = paymentEditRef.replace(/\D/g, "").slice(0, 6);
      const metodoDesc =
        paymentEditTipo === "bolivares"
          ? "Pago Móvil / Transferencia Bs (Tasa BCV)"
          : paymentEditTipo === "dolares_efectivo"
            ? "Dólares en Efectivo ($ Cash)"
            : "USDT (Binance / Cripto)";

      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: editingPaymentOrder.id,
          tipoPago: paymentEditTipo,
          referenciaPago: cleanRef || undefined,
          metodoPago: metodoDesc,
          estado: editingPaymentOrder.estado === "pendiente" ? "pagado" : editingPaymentOrder.estado,
        }),
      });

      if (!res.ok) throw new Error("Error al actualizar pago del pedido");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingPaymentOrder.id
            ? {
              ...o,
              tipoPago: paymentEditTipo,
              referenciaPago: cleanRef || undefined,
              metodoPago: metodoDesc,
              estado: o.estado === "pendiente" ? "pagado" : o.estado,
              updatedAt: new Date().toISOString(),
            }
            : o
        )
      );

      setEditingPaymentOrder(null);
    } catch (err: any) {
      alert(err.message || "Error al actualizar pago");
    } finally {
      setSavingPaymentEdit(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Eliminar este gasto de la contabilidad?")) return;
    try {
      const res = await fetch(`/api/accounting/expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenPaymentEdit = (order: Order) => {
    setEditingPaymentOrder(order);
    setPaymentEditTipo((order.tipoPago as any) || "bolivares");
    setPaymentEditRef(order.referenciaPago || "");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginForm onLoginSuccess={() => setIsAuthenticated(true)} title="Contabilidad: Debe y Haber" />;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      <AdminNav onLogout={() => setIsAuthenticated(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ENCABEZADO Y CONTROLES PRINCIPALES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Libro Contable</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Debe y Haber
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registro directo de ingresos por pedidos cobrados y egresos operativos con saldo neto de caja.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Selector de Período */}
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedRange("mes")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedRange === "mes" ? "bg-emerald-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => setSelectedRange("todo")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedRange === "todo" ? "bg-emerald-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Histórico
              </button>
            </div>

            {/* Botón Registrar Egreso / Gasto */}
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Gasto (Debe)</span>
            </button>

            {/* Botón Mesa USDT */}
            <button
              type="button"
              onClick={() => setShowUsdtModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>Operación USDT</span>
            </button>

            {/* Botón Nuevo Pedido */}
            <Link
              href="/admin/pedidos?nuevo=1"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Pedido</span>
            </Link>
          </div>
        </div>

        {/* 3 TARJETAS RESUMEN EJECUTIVO (HABER, DEBE Y SALDO NETO) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. HABER (Ingresos / Entradas) */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>HABER (Ingresos Cobrados)</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {totales.haberCount} pedidos
              </span>
            </div>
            <p className="text-3xl font-black text-emerald-700">+{formatUsd(totales.totalHaber)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Dinero recibido de clientes por ventas confirmadas.
            </p>
          </div>

          {/* 2. DEBE (Egresos / Salidas / Gastos) */}
          <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between text-rose-800 mb-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>DEBE (Egresos y Gastos)</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {totales.debeCount} salidas
              </span>
            </div>
            <p className="text-3xl font-black text-rose-700">-{formatUsd(totales.totalDebe)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Compras a proveedores, fletes y gastos operativos.
            </p>
          </div>

          {/* 3. SALDO NETO (Balance en Caja) */}
          <div
            className={`p-5 rounded-2xl border shadow-2xs relative overflow-hidden ${totales.saldoNeto >= 0
                ? "bg-slate-900 border-slate-800 text-white"
                : "bg-rose-950 border-rose-900 text-white"
              }`}
          >
            <div className="flex items-center justify-between text-slate-300 mb-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>SALDO NETO (Caja Actual)</span>
              </span>
              <span className="text-[11px] font-bold text-slate-400">Haber - Debe</span>
            </div>
            <p className={`text-3xl font-black ${totales.saldoNeto >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totales.saldoNeto >= 0 ? `+${formatUsd(totales.saldoNeto)}` : `-${formatUsd(Math.abs(totales.saldoNeto))}`}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Utilidad limpia en mano después de cubrir todos los pagos.
            </p>
          </div>
        </div>

        {/* DESGLOSE RÁPIDO DE CAJA POR MONEDA */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Desglose Disponible en Caja:</span>
          </div>

          <div className="flex items-center gap-6 flex-wrap text-xs">
            {/* Bolívares */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">🇻🇪 Bolívares:</span>
              <span className="font-black text-slate-900">
                {formatUsd(totales.saldoBs)}{" "}
                <span className="text-[11px] text-slate-400 font-normal">
                  (≈ {formatVes(totales.saldoBsVes)})
                </span>
              </span>
            </div>

            {/* Dólares Efectivo */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">💵 $ Efectivo:</span>
              <span className="font-black text-slate-900">{formatUsd(totales.saldoUsd)}</span>
            </div>

            {/* USDT */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">🪙 USDT:</span>
              <span className="font-black text-emerald-700">{totales.saldoUsdt.toFixed(2)} USDT</span>
            </div>

            {/* Tasa BCV */}
            <div className="text-[11px] text-slate-400 border-l border-slate-200 pl-4 hidden sm:block">
              Tasa BCV: <strong>{formatVes(bcvRate)}</strong>
            </div>
          </div>
        </div>

        {/* BANNER INFORMATIVO: PEDIDOS PENDIENTES POR COBRAR */}
        {pedidosPendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold">
                  Tienes <strong>{pedidosPendientes.length} pedido(s) pendiente(s) por cobrar</strong> por un monto total de{" "}
                  <strong>{formatUsd(totalPendientesUsd)}</strong>.
                </p>
                <p className="text-[11px] text-amber-700">
                  Al confirmar el pago del cliente, se anexará automáticamente en el HABER con su método de cobro y referencia.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTipoMovimientoFilter(tipoMovimientoFilter === "pendientes" ? "todos" : "pendientes")}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs shrink-0 cursor-pointer"
            >
              {tipoMovimientoFilter === "pendientes" ? "Ver Todo el Libro" : `Revisar ${pedidosPendientes.length} Pendiente(s)`}
            </button>
          </div>
        )}

        {/* NAVEGACIÓN SECUNDARIA / PESTAÑAS */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("debe_haber");
                setTipoMovimientoFilter("todos");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${activeTab === "debe_haber"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Libro Diario (Debe y Haber)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-white font-bold">
                {movimientos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("usdt")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${activeTab === "usdt"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
            >
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Mesa USDT ({filteredUsdtTransactions.length})</span>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, #SUMI, ref..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-emerald-600 w-44 sm:w-60 shadow-2xs"
            />
          </div>
        </div>

        {/* VISTA 1: LIBRO DIARIO UNIFICADO (DEBE Y HABER) */}
        {activeTab === "debe_haber" && (
          <div className="space-y-4">
            {/* Píldoras de Filtro para Movimientos */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setTipoMovimientoFilter("todos")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tipoMovimientoFilter === "todos"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
              >
                Todos ({movimientos.length})
              </button>

              <button
                type="button"
                onClick={() => setTipoMovimientoFilter("haber")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tipoMovimientoFilter === "haber"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
                  }`}
              >
                🟢 Solo Haber / Ingresos ({totales.haberCount} · +{formatUsd(totales.totalHaber)})
              </button>

              <button
                type="button"
                onClick={() => setTipoMovimientoFilter("debe")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tipoMovimientoFilter === "debe"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "bg-white text-rose-800 border border-rose-200 hover:bg-rose-50"
                  }`}
              >
                🔴 Solo Debe / Egresos ({totales.debeCount} · -{formatUsd(totales.totalDebe)})
              </button>

              {pedidosPendientes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTipoMovimientoFilter("pendientes")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tipoMovimientoFilter === "pendientes"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
                    }`}
                >
                  ⏳ Pendientes por Cobrar ({pedidosPendientes.length} · {formatUsd(totalPendientesUsd)})
                </button>
              )}
            </div>

            {/* TABLA: DEBE Y HABER */}
            {tipoMovimientoFilter === "pendientes" ? (
              /* Subtabla de pedidos pendientes para cobrarlos */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-amber-50/50 border-b border-amber-200 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-amber-900">
                    Pedidos Pendientes de Pago ({pedidosPendientes.length})
                  </span>
                  <span className="text-xs font-black text-amber-800">
                    Total por ingresar al Haber: {formatUsd(totalPendientesUsd)}
                  </span>
                </div>
                <div className="overflow-x-auto [scrollbar-width:none]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3">Fecha</th>
                        <th className="py-3 px-3">Pedido</th>
                        <th className="py-3 px-3">Cliente</th>
                        <th className="py-3 px-3">Monto</th>
                        <th className="py-3 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pedidosPendientes.map((ord) => (
                        <tr key={ord.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleDateString("es-VE", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {ord.codigo}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {ord.clienteNombre}
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900">
                            {formatUsd(ord.totalUsd || 0)}
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentEdit(ord)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200 text-xs"
                            >
                              Registrar Pago y Referencia
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkOrderPaid(ord.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 text-xs"
                            >
                              Marcar como Cobrado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto [scrollbar-width:none]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3">Fecha / Hora</th>
                        <th className="py-3 px-3">Tipo</th>
                        <th className="py-3 px-3">Concepto / Detalle</th>
                        <th className="py-3 px-3">Método & Ref.</th>
                        <th className="py-3 px-3 text-right text-rose-800 bg-rose-50/40">DEBE (Salidas)</th>
                        <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/40">HABER (Entradas)</th>
                        <th className="py-3 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movimientosVisibles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400">
                            No hay movimientos registrados en este período.
                          </td>
                        </tr>
                      ) : (
                        movimientosVisibles.map((mov) => (
                          <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Fecha */}
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {new Date(mov.fecha).toLocaleDateString("es-VE", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>

                            {/* Tipo */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {mov.tipo === "haber" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <ArrowDownLeft className="w-3 h-3" />
                                  <span>HABER</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>DEBE</span>
                                </span>
                              )}
                            </td>

                            {/* Concepto */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{mov.concepto}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span>{mov.categoria}</span>
                                {mov.clienteTelefono && (
                                  <>
                                    <span>·</span>
                                    <a
                                      href={`https://wa.me/${normalizeWhatsAppPhone(mov.clienteTelefono)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
                                    >
                                      <WhatsAppIcon className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Método & Referencia */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">{mov.metodoDesc}</div>
                              {mov.referencia ? (
                                <div className="text-[10px] font-mono font-bold text-emerald-700 mt-0.5">
                                  Ref: {mov.referencia}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 mt-0.5">Sin ref.</div>
                              )}
                            </td>

                            {/* DEBE */}
                            <td className="py-3 px-3 text-right font-black text-rose-700 bg-rose-50/20 whitespace-nowrap">
                              {mov.tipo === "debe" ? `-${formatUsd(mov.monto)}` : "—"}
                            </td>

                            {/* HABER */}
                            <td className="py-3 px-3 text-right font-black text-emerald-700 bg-emerald-50/20 whitespace-nowrap">
                              {mov.tipo === "haber" ? `+${formatUsd(mov.monto)}` : "—"}
                            </td>

                            {/* Acciones */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {mov.order && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentEdit(mov.order!)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar forma de pago o referencia"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}

                              {mov.expense && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(mov.expense!.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar este gasto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: MESA USDT & PROVEEDORES */}
        {activeTab === "usdt" && (
          <UsdtTable
            transactions={filteredUsdtTransactions}
            rates={usdtRates}
            bcvRate={bcvRate}
            onOpenCreateModal={() => setShowUsdtModal(true)}
            onOpenRatesModal={() => setShowRatesModal(true)}
            onTransactionDeleted={(id) => setUsdtTransactions((prev) => prev.filter((t) => t.id !== id))}
          />
        )}
      </main>

      {/* MODAL REGISTRAR GASTO */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        bcvRate={bcvRate}
        usdtRate={usdtRates.tasaVentaUsdt || 925}
        onExpenseCreated={(exp) => {
          setExpenses((prev) => [exp, ...prev]);
          loadData();
        }}
      />

      {/* MODAL REGISTRAR OPERACIÓN USDT */}
      <UsdtModal
        isOpen={showUsdtModal}
        onClose={() => setShowUsdtModal(false)}
        rates={usdtRates}
        onTransactionCreated={(tx) => {
          setUsdtTransactions((prev) => [tx, ...prev]);
          loadData();
        }}
      />

      {/* MODAL CONFIGURAR TASAS USDT */}
      <UsdtRatesModal
        isOpen={showRatesModal}
        onClose={() => setShowRatesModal(false)}
        currentRates={usdtRates}
        bcvRate={bcvRate}
        onRatesUpdated={(rates) => {
          setUsdtRates(rates);
          loadData();
        }}
      />

      {/* MODAL EDITAR PAGO DE PEDIDO (Bs, $ Efectivo, USDT y Ref 6 dígitos) */}
      {editingPaymentOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Registrar / Editar Pago en Contabilidad</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Pedido {editingPaymentOrder.codigo} · {editingPaymentOrder.clienteNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaymentOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePaymentEdit} className="mt-4 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Método de Cobro (Moneda Recibida)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentEditTipo("bolivares")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${paymentEditTipo === "bolivares"
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <span>🇻🇪 Bolívares</span>
                    <span className="text-[10px] font-normal opacity-90">Pago Móvil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentEditTipo("dolares_efectivo")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${paymentEditTipo === "dolares_efectivo"
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <span>💵 $ Efectivo</span>
                    <span className="text-[10px] font-normal opacity-90">Cash / Divisas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentEditTipo("usdt")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${paymentEditTipo === "usdt"
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-black"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <span>🪙 USDT</span>
                    <span className="text-[10px] font-normal opacity-90">Binance Pay</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Número de Referencia (6 dígitos)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {paymentEditRef.length}/6 dígitos
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={paymentEditRef}
                  onChange={(e) => setPaymentEditRef(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Ej: 849201"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-black tracking-widest text-slate-900 focus:bg-white focus:outline-emerald-600"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Ingresa los 6 dígitos del comprobante bancario, pago móvil o Binance para conciliación.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPaymentOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPaymentEdit}
                  className="px-5 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingPaymentEdit ? "Guardando..." : "Guardar en Contabilidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
