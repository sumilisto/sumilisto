"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import {
  Activity, Users, Eye, Package, MapPin, Globe, Smartphone, Monitor,
  Download, Printer, RefreshCw, ArrowLeft, Lock, User, LogOut,
  ExternalLink, TrendingUp, CheckCircle2, AlertCircle, Compass, Shield,
  Layers, ShoppingBag, Clock, Sparkles, Filter, ChevronRight
} from "lucide-react";

interface StatItem {
  nombre?: string;
  ciudad?: string;
  estado?: string;
  total: number;
  porcentaje: number;
}

interface ProductStat {
  sku: string;
  nombre: string;
  slug: string;
  categoria: string;
  fotoUrl: string;
  views: number;
  uniqueVisitors: number;
  porcentaje: number;
}

interface TimelinePoint {
  label: string;
  visitas: number;
}

interface LiveVisit {
  id: string;
  fecha: string;
  ciudad: string;
  estado: string;
  ruta: string;
  productoNombre?: string;
  productoSku?: string;
  dispositivo: string;
  navegador: string;
}

interface AnalyticsData {
  range: string;
  resumen: {
    totalVisitas: number;
    visitantesUnicos: number;
    activosAhora: number;
    vistasProductos: number;
    promedioPorUsuario: string;
  };
  topEstados: StatItem[];
  topCiudades: StatItem[];
  topProductos: ProductStat[];
  dispositivos: Record<string, number>;
  navegadores: Record<string, number>;
  timeline: TimelinePoint[];
  ultimasVisitas: LiveVisit[];
  generatedAt: string;
}

export default function AdminEstadisticasPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [range, setRange] = useState<"hoy" | "ayer" | "7d" | "30d" | "todo">("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Verificar autenticación
  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) loadStats(range);
    });
  }, []);

  const loadStats = useCallback(async (selectedRange: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/stats?range=${selectedRange}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Error al cargar analítica:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Intervalo de auto-refresco (cada 15 segundos si está activado)
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;
    const interval = setInterval(() => {
      loadStats(range);
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh, range, loadStats]);

  const handleRangeChange = (newRange: "hoy" | "ayer" | "7d" | "30d" | "todo") => {
    setRange(newRange);
    loadStats(newRange);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const res = await loginAdmin(usernameInput, passwordInput);
      if (res.ok) {
        setIsAuthenticated(true);
        loadStats(range);
      } else {
        setAuthError(res.error || "Credenciales incorrectas.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  // Exportar reporte CSV para Excel
  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "REPORTE DE ESTADÍSTICAS Y TRÁFICO - SUMILISTO\n";
    csvContent += `Generado el: ${new Date().toLocaleString("es-VE")}\n`;
    csvContent += `Período: ${range}\n\n`;

    // Resumen
    csvContent += "MÉTRICA,VALOR\n";
    csvContent += `Total Visitas,${data.resumen.totalVisitas}\n`;
    csvContent += `Visitantes Únicos,${data.resumen.visitantesUnicos}\n`;
    csvContent += `Activos Ahora (En Vivo),${data.resumen.activosAhora}\n`;
    csvContent += `Vistas a Productos,${data.resumen.vistasProductos}\n`;
    csvContent += `Promedio Páginas / Usuario,${data.resumen.promedioPorUsuario}\n\n`;

    // Estados
    csvContent += "ESTADO (VENEZUELA),VISITAS,PORCENTAJE\n";
    data.topEstados.forEach((e) => {
      csvContent += `"${e.nombre}",${e.total},${e.porcentaje}%\n`;
    });
    csvContent += "\n";

    // Ciudades
    csvContent += "CIUDAD,ESTADO,VISITAS,PORCENTAJE\n";
    data.topCiudades.forEach((c) => {
      csvContent += `"${c.ciudad}","${c.estado}",${c.total},${c.porcentaje}%\n`;
    });
    csvContent += "\n";

    // Productos
    csvContent += "SKU,PRODUCTO,VISTAS,VISITANTES ÚNICOS,PORCENTAJE\n";
    data.topProductos.forEach((p) => {
      csvContent += `"${p.sku}","${p.nombre.replace(/"/g, '""')}",${p.views},${p.uniqueVisitors},${p.porcentaje}%\n`;
    });
    csvContent += "\n";

    // Últimas visitas
    csvContent += "FECHA,CIUDAD,ESTADO,PÁGINA O PRODUCTO,DISPOSITIVO,NAVEGADOR\n";
    data.ultimasVisitas.forEach((v) => {
      csvContent += `"${new Date(v.fecha).toLocaleString("es-VE")}","${v.ciudad}","${v.estado}","${(v.productoNombre || v.ruta).replace(/"/g, '""')}","${v.dispositivo}","${v.navegador}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_visitas_sumilisto_${range}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir reporte formal
  const handlePrint = () => {
    window.print();
  };

  const getElapsedTimeText = (dateString: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffSec < 45) return "Justo ahora";
    if (diffSec < 60) return `Hace ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin === 1) return "Hace 1 min";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return "Hace 1 hora";
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
  };

  if (!authChecked) {
    return <div className="max-w-md mx-auto px-4 py-24 text-center text-sm text-slate-400">Verificando credenciales...</div>;
  }

  // Pantalla de Login Admin
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col gap-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-50 text-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-emerald-800" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Panel de Estadísticas y Visitas</h1>
            <p className="text-xs text-slate-500 mt-1">Ingresa tus credenciales de administrador para ver las analíticas en tiempo real.</p>
          </div>
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Usuario" value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" placeholder="••••••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
            </div>
            {authError && <p className="text-xs text-rose-500 font-semibold">{authError}</p>}
          </div>
          <button type="submit" disabled={loggingIn}
            className="w-full h-11 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover disabled:opacity-60 transition-colors shadow-sm">
            {loggingIn ? "Verificando..." : "Ingresar al Panel"}
          </button>
        </form>
      </div>
    );
  }

  const maxTimelineValue = data?.timeline ? Math.max(...data.timeline.map((t) => t.visitas), 1) : 1;
  const maxProductViews = data?.topProductos?.length ? Math.max(...data.topProductos.map((p) => p.views), 1) : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-8 print:p-0 print:m-0 print:max-w-none">
      
      {/* ── BARRA SUPERIOR: NAVEGACIÓN Y ENCABEZADO ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-2 text-xs">
            <Link href="/admin/settings" className="font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Ajustes Tienda
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/admin/productos" className="font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors">
              <Package className="w-3.5 h-3.5 text-brand" /> Productos y Fotos
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/admin/carritos" className="font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors">
              <ShoppingBag className="w-3.5 h-3.5" /> Carritos Abandonados
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Estadísticas y Tráfico en Vivo
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  En Vivo
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Monitorea de qué estados y ciudades de Venezuela te visitan, productos más vistos y genera reportes en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones y Exportación */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Auto-refresh */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            }`}
            title="Actualiza automáticamente las métricas cada 15 segundos"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span>{autoRefresh ? "Auto (15s)" : "Pausado"}</span>
          </button>

          {/* Refrescar manual */}
          <button
            type="button"
            onClick={() => loadStats(range)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            <span>Actualizar</span>
          </button>

          {/* Exportar CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Descargar CSV (Excel)</span>
          </button>

          {/* Imprimir / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Reporte</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── ENCABEZADO EXCLUSIVO PARA IMPRESIÓN (MEMBRETE EJECUTIVO) ── */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">SUMILISTO C.A.</h1>
            <p className="text-xs font-bold text-slate-600">Reporte Ejecutivo de Tráfico Web, Geolocalización y Demanda de Productos</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Período evaluado: <strong className="uppercase">{range}</strong> · Emisión: {new Date().toLocaleString("es-VE")}
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold text-slate-800">sumilisto.com</span>
            <p className="text-[10px] text-slate-500">Caracas · Guarenas · Guatire · Venezuela</p>
          </div>
        </div>
      </div>

      {/* ── SELECTOR DE FILTRO DE TIEMPO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-xs font-bold text-slate-600">Período de Análisis:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "hoy", label: "Hoy" },
              { id: "ayer", label: "Ayer" },
              { id: "7d", label: "Últimos 7 días" },
              { id: "30d", label: "Últimos 30 días" },
              { id: "todo", label: "Histórico Total" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleRangeChange(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                range === t.id
                  ? "bg-brand text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 TARJETAS KPI PRINCIPALES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Visitas Totales */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Páginas Vistas
              </span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : (data?.resumen.totalVisitas ?? 0).toLocaleString("es-VE")}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                <span className="text-emerald-700 font-bold">
                  ~{data?.resumen.promedioPorUsuario || "1.0"}
                </span>
                <span>páginas por sesión</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 2: Visitantes Únicos */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Visitantes Únicos
              </span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : (data?.resumen.visitantesUnicos ?? 0).toLocaleString("es-VE")}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Dispositivos identificados</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-100/70 text-blue-800 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 3: Activos Ahora (En Vivo) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-bl-full -z-0 opacity-70 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 block">
                  Activos Ahora
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-3xl font-black text-emerald-900 tracking-tight flex items-baseline gap-2">
                <span>{loading ? "..." : (data?.resumen.activosAhora ?? 0)}</span>
                <span className="text-xs font-bold text-emerald-600 uppercase">En Línea</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                Últimos 5 minutos navegando
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>

        {/* KPI 4: Vistas a Productos */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Vistas a Productos
              </span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : (data?.resumen.vistasProductos ?? 0).toLocaleString("es-VE")}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-purple-700 font-bold">
                <Package className="w-3.5 h-3.5" />
                <span>Interés en Catálogo</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-100/70 text-purple-800 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── GRÁFICO DE TENDENCIA DE TRÁFICO (TIMELINE) ── */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              Tendencia de Visitas a lo largo del tiempo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {range === "hoy" || range === "ayer"
                ? "Distribución de visitas por hora del día (Hora Venezuela)"
                : "Evolución diaria de visitas"}
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Pico máximo: <strong className="text-slate-800">{maxTimelineValue} visitas</strong>
          </span>
        </div>

        {/* Barras del gráfico */}
        <div className="pt-4 pb-2">
          {data?.timeline && data.timeline.length > 0 ? (
            <div className="flex items-end gap-1.5 sm:gap-2.5 h-44 w-full px-1">
              {data.timeline.map((point, idx) => {
                const heightPct = Math.max(8, Math.round((point.visitas / maxTimelineValue) * 100));
                const isPeak = point.visitas === maxTimelineValue && maxTimelineValue > 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    {/* Tooltip flotante al pasar el mouse */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md transition-opacity z-20 whitespace-nowrap">
                      {point.visitas} visita{point.visitas !== 1 ? "s" : ""}
                    </div>

                    <div className="text-[10px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {point.visitas > 0 ? point.visitas : ""}
                    </div>

                    {/* Barra */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isPeak
                          ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm ring-2 ring-emerald-300"
                          : point.visitas > 0
                          ? "bg-gradient-to-t from-emerald-700 to-emerald-500 group-hover:from-emerald-600 group-hover:to-teal-400"
                          : "bg-slate-100"
                      }`}
                    />

                    {/* Etiqueta de eje X */}
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 truncate w-full text-center">
                      {point.label.includes("-") ? point.label.split("-").slice(1).join("/") : point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-xs">
              No hay suficientes registros para el rango seleccionado.
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN GEOGRÁFICA: ESTADOS Y CIUDADES DE VENEZUELA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna 1: Estados de Venezuela */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand" />
                Conexiones por Estado (Venezuela 🇻🇪)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Regiones con mayor afluencia de clientes</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              {data?.topEstados?.length ?? 0} Estados
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {data?.topEstados && data.topEstados.length > 0 ? (
              data.topEstados.map((item, idx) => (
                <div key={idx} className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-4 text-[10px] font-black text-slate-400">#{idx + 1}</span>
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{item.nombre}</span>
                    </span>
                    <div className="flex items-center gap-2 font-black">
                      <span className="text-slate-900">{item.total} visitas</span>
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {item.porcentaje}%
                      </span>
                    </div>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(4, item.porcentaje))}%` }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-slate-400">Sin datos de estados para este período.</p>
            )}
          </div>
        </div>

        {/* Columna 2: Ciudades de Venezuela */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-600" />
                Ciudades y Municipios Principales
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Lugares exactos desde donde compran</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
              Top 10 Ciudades
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {data?.topCiudades && data.topCiudades.length > 0 ? (
              data.topCiudades.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 text-[10px] font-black text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-slate-900">{item.ciudad}</span>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.estado}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-black">
                      <span className="text-slate-900">{item.total} visitas</span>
                      <span className="text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                        {item.porcentaje}%
                      </span>
                    </div>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(4, item.porcentaje))}%` }}
                      className="h-full bg-gradient-to-r from-teal-600 to-cyan-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-slate-400">Sin datos de ciudades para este período.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── RANKING DE PRODUCTOS MÁS VISTOS ── */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand" />
              Ranking de Productos Más Vistos y Consultados
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Descubre qué suministros y empaques generan mayor interés en tus clientes mayoristas
            </p>
          </div>
          <span className="text-[11px] font-bold px-2 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
            {data?.topProductos?.length ?? 0} Productos con visitas
          </span>
        </div>

        {data?.topProductos && data.topProductos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2"># Posición</th>
                  <th className="pb-3">Producto y SKU</th>
                  <th className="pb-3 text-center">Categoría</th>
                  <th className="pb-3 text-center">Visitas Totales</th>
                  <th className="pb-3 text-center">Visitantes Únicos</th>
                  <th className="pb-3">Interés Relativo</th>
                  <th className="pb-3 pr-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topProductos.map((p, idx) => {
                  const relativePct = Math.round((p.views / maxProductViews) * 100);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-2 font-black text-slate-400">
                        {idx === 0 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shadow-xs">1</span>
                        ) : idx === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center font-black text-xs">2</span>
                        ) : idx === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700/70 text-white flex items-center justify-center font-black text-xs">3</span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {p.fotoUrl ? (
                            <img src={p.fotoUrl} alt={p.nombre} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block max-w-xs sm:max-w-md truncate">
                              {p.nombre}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-black">
                              SKU: {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {p.categoria}
                        </span>
                      </td>
                      <td className="py-3 text-center font-black text-slate-900 text-sm">
                        {p.views}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-600">
                        {p.uniqueVisitors} clientes
                      </td>
                      <td className="py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{ width: `${relativePct}%` }}
                              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">
                            {relativePct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        {p.slug && (
                          <a
                            href={`/producto/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                          >
                            <span>Ver Ficha</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            Aún no hay visitas registradas a fichas de productos en este período.
          </div>
        )}
      </div>

      {/* ── DISPOSITIVOS Y NAVEGADORES ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {/* Dispositivos */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            Dispositivos de Acceso
          </h3>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <Smartphone className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
              <span className="text-[11px] font-bold text-slate-600 block">Teléfonos</span>
              <span className="text-lg font-black text-slate-900">
                {data?.dispositivos?.["Móvil"] ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <Monitor className="w-5 h-5 text-blue-700 mx-auto mb-1" />
              <span className="text-[11px] font-bold text-slate-600 block">Computadoras</span>
              <span className="text-lg font-black text-slate-900">
                {data?.dispositivos?.["Escritorio"] ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <Layers className="w-5 h-5 text-purple-700 mx-auto mb-1" />
              <span className="text-[11px] font-bold text-slate-600 block">Tablets</span>
              <span className="text-lg font-black text-slate-900">
                {data?.dispositivos?.["Tablet"] ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Navegadores */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Navegadores Utilizados
          </h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {data?.navegadores && Object.entries(data.navegadores).map(([nav, count]) => (
              <div key={nav} className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold flex items-center gap-2">
                <span className="text-slate-700">{nav}:</span>
                <span className="text-brand font-black">{count} visitas</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEED DE VISITAS EN VIVO (ÚLTIMOS EVENTOS) ── */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand" />
                Registro de Visitas Recientes (Tiempo Real)
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Últimos eventos registrados en la tienda</p>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Actualizado a las {lastUpdated.toLocaleTimeString("es-VE")}
          </span>
        </div>

        {data?.ultimasVisitas && data.ultimasVisitas.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.ultimasVisitas.map((v) => (
              <div key={v.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    {v.dispositivo === "Móvil" ? (
                      <Smartphone className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Monitor className="w-4 h-4 text-blue-700" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {v.ciudad}, {v.estado}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        · {v.dispositivo} ({v.navegador})
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {v.productoNombre ? (
                        <span className="text-purple-700 font-semibold flex items-center gap-1">
                          <Package className="w-3 h-3" /> Ficha: {v.productoNombre} ({v.productoSku})
                        </span>
                      ) : (
                        <span>Ruta: {v.ruta}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-500 shrink-0 self-end sm:self-center">
                  {getElapsedTimeText(v.fecha)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-xs text-slate-400">Sin visitas recientes registradas.</p>
        )}
      </div>

    </div>
  );
}
