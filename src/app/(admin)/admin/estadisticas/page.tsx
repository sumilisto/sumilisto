"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import {
  Activity, Users, Eye, Package, MapPin, Globe, Smartphone, Monitor,
  Download, Printer, RefreshCw, ArrowLeft, Lock, User, LogOut,
  ExternalLink, TrendingUp, CheckCircle2, AlertCircle, Compass, Shield,
  Layers, ShoppingBag, Clock, Sparkles, Filter, ChevronRight, HelpCircle, Info, ChevronDown
} from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";

interface StatItem {
  nombre?: string;
  ciudad?: string;
  estado?: string;
  total: number;
  visitantesUnicos?: number;
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
  visitantesUnicos?: number;
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

interface UniqueVisitorLive {
  sessionId: string;
  ciudad: string;
  estado: string;
  pais: string;
  dispositivo: string;
  navegador: string;
  primeraActividad: string;
  ultimaActividad: string;
  totalPaginasVistas: number;
  ultimaRuta: string;
  ultimoProductoNombre?: string;
  ultimoProductoSku?: string;
  productosVistos: string[];
  rutasVistas: string[];
  isOnline: boolean;
  esHumano?: boolean;
  historial?: Array<{
    hora: string;
    ruta: string;
    productoNombre?: string;
    productoSku?: string;
  }>;
}

interface AnalyticsData {
  range: string;
  filtro?: "humanos" | "todos";
  resumen: {
    totalVisitas: number;
    visitantesUnicos: number;
    activosAhora: number;
    vistasProductos: number;
    promedioPorUsuario: string;
    totalBotsExcluidos?: number;
    visitasBotsExcluidas?: number;
  };
  topEstados: StatItem[];
  topCiudades: StatItem[];
  topProductos: ProductStat[];
  dispositivos: Record<string, number>;
  navegadores: Record<string, number>;
  timeline: TimelinePoint[];
  ultimosVisitantes?: UniqueVisitorLive[];
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
  const [trafficFilter, setTrafficFilter] = useState<"humanos" | "todos">("humanos");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [liveViewMode, setLiveViewMode] = useState<"unicos" | "eventos">("unicos");
  const [timelineMetric, setTimelineMetric] = useState<"visitantesUnicos" | "visitas">("visitantesUnicos");
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(null);
  const [isDeviceExcluded, setIsDeviceExcluded] = useState(true);

  const loadStats = useCallback(async (selectedRange: string, selectedFilter: "humanos" | "todos" = trafficFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/stats?range=${selectedRange}&filtro=${selectedFilter}`, { cache: "no-store" });
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
  }, [trafficFilter]);

  // Verificar autenticación y marcar dispositivo para no sumar visitas
  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) {
        try {
          localStorage.setItem("sumilisto_is_admin", "true");
          if (localStorage.getItem("sumilisto_exclude_analytics") !== "false") {
            localStorage.setItem("sumilisto_exclude_analytics", "true");
            setIsDeviceExcluded(true);
          } else {
            setIsDeviceExcluded(false);
          }
        } catch {}
        loadStats(range, trafficFilter);
      }
    });
  }, []);

  const toggleExcludeDevice = () => {
    const nextVal = !isDeviceExcluded;
    setIsDeviceExcluded(nextVal);
    try {
      localStorage.setItem("sumilisto_exclude_analytics", nextVal ? "true" : "false");
    } catch {}
  };

  const handleTrafficFilterChange = (newFilter: "humanos" | "todos") => {
    setTrafficFilter(newFilter);
    loadStats(range, newFilter);
  };

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
        try {
          localStorage.setItem("sumilisto_is_admin", "true");
          localStorage.setItem("sumilisto_exclude_analytics", "true");
          setIsDeviceExcluded(true);
        } catch {}
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

  const maxTimelineValue = data?.timeline
    ? Math.max(
        ...data.timeline.map((t) =>
          timelineMetric === "visitantesUnicos" ? (t.visitantesUnicos ?? t.visitas) : t.visitas
        ),
        1
      )
    : 1;
  const maxProductViews = data?.topProductos?.length ? Math.max(...data.topProductos.map((p) => p.views), 1) : 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="print:hidden">
        <AdminNav onLogout={() => setIsAuthenticated(false)} />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 print:p-0 print:m-0 print:max-w-none">
        
        {/* ── BARRA SUPERIOR: ENCABEZADO Y ACCIONES ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 print:hidden">
          <div>

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

          {/* Exclusión de este dispositivo (Dueño/Admin) */}
          <button
            type="button"
            onClick={toggleExcludeDevice}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              isDeviceExcluded
                ? "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100 shadow-xs"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            }`}
            title="Cuando está activo, tus visitas desde este navegador (PC o tlf) no se contabilizan en las estadísticas"
          >
            <Shield className={`w-3.5 h-3.5 ${isDeviceExcluded ? "text-purple-600" : "text-slate-400"}`} />
            <span>{isDeviceExcluded ? "Mi equipo: Excluido" : "Excluir mi equipo"}</span>
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

      {/* ── SELECTOR DE FILTRO DE TIEMPO Y AUDIENCIA (ANTI-BOTS) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        {/* Período */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 pl-1 pr-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Período:</span>
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  range === t.id
                    ? "bg-brand text-white shadow-xs font-black"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de Audiencia (Humanos vs Bots / Datacenters) */}
        <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-3">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">Audiencia:</span>
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleTrafficFilterChange("humanos")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                trafficFilter === "humanos"
                  ? "bg-white text-emerald-800 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Aisla y muestra únicamente clientes y personas reales, descartando bots, rastreadores y servidores en la nube"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Solo Humanos Reales</span>
            </button>
            <button
              type="button"
              onClick={() => handleTrafficFilterChange("todos")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                trafficFilter === "todos"
                  ? "bg-white text-brand shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Muestra todo el tráfico de red, incluyendo rastreadores de Google, WhatsApp y servidores de centros de datos"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Todo el Tráfico</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner de estado del Filtro Anti-Bots */}
      {trafficFilter === "humanos" && (data?.resumen.totalBotsExcluidos ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-xs text-emerald-950 font-medium shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Filtro Anti-Bots activo:</strong> Se han aislado y excluido <strong>{data?.resumen.totalBotsExcluidos} rastreadores y servidores de nube</strong> ({data?.resumen.visitasBotsExcluidas} eventos de fondo). Tus métricas reflejan exclusivamente personas reales.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleTrafficFilterChange("todos")}
            className="text-[11px] underline font-bold text-emerald-800 hover:text-emerald-950 shrink-0 self-end sm:self-center"
          >
            Ver tráfico completo
          </button>
        </div>
      )}

      {/* ── 4 TARJETAS KPI PRINCIPALES CON LEYENDA EXPLICATIVA AL POSICIONARSE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Visitas Totales */}
        <div
          className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative transition-all cursor-pointer group hover:border-emerald-400 hover:shadow-md"
          onClick={() => setActiveTooltip(activeTooltip === "visitas" ? null : "visitas")}
          onMouseEnter={() => setActiveTooltip("visitas")}
          onMouseLeave={() => setActiveTooltip(null)}
          title="Haz clic o pasa el cursor para ver la explicación detallada"
        >
          {/* Fondo decorativo recortado */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-60 group-hover:scale-110 transition-transform" />
          </div>

          {/* Leyenda Flotante Explicativa */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+12px)] w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 z-50 transition-all duration-200 ${
              activeTooltip === "visitas"
                ? "opacity-100 visible translate-y-0"
                : "opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0"
            }`}
            style={{ pointerEvents: activeTooltip === "visitas" ? "auto" : "none" }}
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                <Eye className="w-4 h-4 shrink-0" />
                <span>Páginas Vistas (Tráfico)</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                Métrica
              </span>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed mb-2">
              Suma total de todas las pantallas, categorías y productos que los usuarios han abierto en la tienda.
            </p>
            <div className="space-y-1.5 text-[11px] bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <div className="flex items-start gap-1.5 text-slate-300">
                <span className="font-bold text-emerald-400 shrink-0">📊 Cálculo:</span>
                <span>Un mismo cliente que ve 3 productos y su carrito suma 4 páginas vistas.</span>
              </div>
              <div className="flex items-start gap-1.5 text-emerald-300 pt-1 border-t border-slate-700/40">
                <span className="font-bold shrink-0">💡 Utilidad:</span>
                <span>Mide el nivel global de interacción y exploración de la tienda.</span>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-slate-900/95" />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Páginas Vistas
                </span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
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
        <div
          className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative transition-all cursor-pointer group hover:border-blue-400 hover:shadow-md"
          onClick={() => setActiveTooltip(activeTooltip === "visitantes" ? null : "visitantes")}
          onMouseEnter={() => setActiveTooltip("visitantes")}
          onMouseLeave={() => setActiveTooltip(null)}
          title="Haz clic o pasa el cursor para ver la explicación detallada"
        >
          {/* Fondo decorativo recortado */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full opacity-60 group-hover:scale-110 transition-transform" />
          </div>

          {/* Leyenda Flotante Explicativa */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+12px)] w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 z-50 transition-all duration-200 ${
              activeTooltip === "visitantes"
                ? "opacity-100 visible translate-y-0"
                : "opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0"
            }`}
            style={{ pointerEvents: activeTooltip === "visitantes" ? "auto" : "none" }}
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-blue-400 text-xs">
                <Users className="w-4 h-4 shrink-0" />
                <span>Visitantes Únicos</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">
                Audiencia
              </span>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed mb-2">
              Cantidad de personas o clientes distintos que ingresaron a la tienda, identificados por su dispositivo o navegador.
            </p>
            <div className="space-y-1.5 text-[11px] bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <div className="flex items-start gap-1.5 text-slate-300">
                <span className="font-bold text-blue-400 shrink-0">📊 Cálculo:</span>
                <span>Si el mismo cliente entra 5 veces al día desde su teléfono, cuenta como 1 visitante único.</span>
              </div>
              <div className="flex items-start gap-1.5 text-blue-300 pt-1 border-t border-slate-700/40">
                <span className="font-bold shrink-0">💡 Utilidad:</span>
                <span>Refleja tu alcance real de clientes sin duplicar visitas de la misma persona.</span>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-slate-900/95" />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Visitantes Únicos
                </span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
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
        <div
          className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative transition-all cursor-pointer group hover:border-emerald-500 hover:shadow-md"
          onClick={() => setActiveTooltip(activeTooltip === "activos" ? null : "activos")}
          onMouseEnter={() => setActiveTooltip("activos")}
          onMouseLeave={() => setActiveTooltip(null)}
          title="Haz clic o pasa el cursor para ver la explicación detallada"
        >
          {/* Fondo decorativo recortado */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-bl-full opacity-70 group-hover:scale-110 transition-transform" />
          </div>

          {/* Leyenda Flotante Explicativa */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+12px)] w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 z-50 transition-all duration-200 ${
              activeTooltip === "activos"
                ? "opacity-100 visible translate-y-0"
                : "opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0"
            }`}
            style={{ pointerEvents: activeTooltip === "activos" ? "auto" : "none" }}
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                <Activity className="w-4 h-4 shrink-0" />
                <span>Usuarios Activos en Vivo</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                Tiempo Real
              </span>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed mb-2">
              Clientes que están navegando por la tienda o armando su pedido en este momento exacto.
            </p>
            <div className="space-y-1.5 text-[11px] bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <div className="flex items-start gap-1.5 text-slate-300">
                <span className="font-bold text-emerald-400 shrink-0">📊 Ventana:</span>
                <span>Actividad registrada en los últimos 5 minutos navegando.</span>
              </div>
              <div className="flex items-start gap-1.5 text-emerald-300 pt-1 border-t border-slate-700/40">
                <span className="font-bold shrink-0">💡 Utilidad:</span>
                <span>Te avisa en vivo si hay personas revisando empaques antes de enviarte el WhatsApp.</span>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-slate-900/95" />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 block">
                  Activos Ahora
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-800 transition-colors" />
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
        <div
          className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs relative transition-all cursor-pointer group hover:border-purple-400 hover:shadow-md"
          onClick={() => setActiveTooltip(activeTooltip === "productos" ? null : "productos")}
          onMouseEnter={() => setActiveTooltip("productos")}
          onMouseLeave={() => setActiveTooltip(null)}
          title="Haz clic o pasa el cursor para ver la explicación detallada"
        >
          {/* Fondo decorativo recortado */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full opacity-60 group-hover:scale-110 transition-transform" />
          </div>

          {/* Leyenda Flotante Explicativa */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+12px)] w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 z-50 transition-all duration-200 ${
              activeTooltip === "productos"
                ? "opacity-100 visible translate-y-0"
                : "opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0"
            }`}
            style={{ pointerEvents: activeTooltip === "productos" ? "auto" : "none" }}
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-purple-400 text-xs">
                <Package className="w-4 h-4 shrink-0" />
                <span>Vistas a Productos</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                Demanda
              </span>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed mb-2">
              Número de veces que los visitantes abrieron la ficha detallada de un producto para ver sus fotos y precios.
            </p>
            <div className="space-y-1.5 text-[11px] bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <div className="flex items-start gap-1.5 text-slate-300">
                <span className="font-bold text-purple-400 shrink-0">📊 Interés:</span>
                <span>Refleja la intención comercial de compra y qué empaques llaman más la atención.</span>
              </div>
              <div className="flex items-start gap-1.5 text-purple-300 pt-1 border-t border-slate-700/40">
                <span className="font-bold shrink-0">💡 Utilidad:</span>
                <span>Te ayuda a detectar qué empaques tienen alta demanda para mantener stock al día.</span>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-slate-900/95" />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Vistas a Productos
                </span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Tendencia a lo largo del tiempo
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {timelineMetric === "visitantesUnicos" ? "Visitantes Únicos" : "Total Páginas"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {range === "hoy" || range === "ayer"
                ? "Distribución por hora del día (Hora Venezuela)"
                : "Evolución diaria durante el período seleccionado"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle métrica */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTimelineMetric("visitantesUnicos")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  timelineMetric === "visitantesUnicos"
                    ? "bg-white text-emerald-800 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Visitantes Únicos</span>
              </button>
              <button
                type="button"
                onClick={() => setTimelineMetric("visitas")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  timelineMetric === "visitas"
                    ? "bg-white text-brand shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Total Páginas</span>
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-400 pl-1">
              Pico: <strong className="text-slate-800">{maxTimelineValue} {timelineMetric === "visitantesUnicos" ? "visitantes" : "visitas"}</strong>
            </span>
          </div>
        </div>

        {/* Barras del gráfico */}
        <div className="pt-4 pb-2">
          {data?.timeline && data.timeline.length > 0 ? (
            <div className="flex items-end gap-1.5 sm:gap-2.5 h-44 w-full px-1">
              {data.timeline.map((point, idx) => {
                const currentVal = timelineMetric === "visitantesUnicos" ? (point.visitantesUnicos ?? point.visitas) : point.visitas;
                const heightPct = Math.max(8, Math.round((currentVal / maxTimelineValue) * 100));
                const isPeak = currentVal === maxTimelineValue && maxTimelineValue > 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    {/* Tooltip flotante al pasar el mouse */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg transition-opacity z-20 whitespace-nowrap text-center">
                      <div>{point.visitantesUnicos ?? point.visitas} visitante{(point.visitantesUnicos ?? point.visitas) !== 1 ? "s únicos" : " único"}</div>
                      <div className="text-[9px] text-slate-300 font-normal">{point.visitas} página{point.visitas !== 1 ? "s vistas" : " vista"}</div>
                    </div>

                    <div className="text-[10px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentVal > 0 ? currentVal : ""}
                    </div>

                    {/* Barra */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isPeak
                          ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm ring-2 ring-emerald-300"
                          : currentVal > 0
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
                      <span className="text-slate-900 flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-600" />
                        {item.visitantesUnicos ?? item.total} <span className="text-[10px] font-medium text-slate-400">({item.total} v.)</span>
                      </span>
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
                      <span className="text-slate-900 flex items-center gap-1">
                        <Users className="w-3 h-3 text-teal-600" />
                        {item.visitantesUnicos ?? item.total} <span className="text-[10px] font-medium text-slate-400">({item.total} v.)</span>
                      </span>
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

      {/* ── FEED DE VISITANTES EN VIVO (ÚNICOS Y TIEMPO REAL) ── */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand" />
                Visitantes en Vivo (Tiempo Real)
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {data?.resumen.activosAhora ?? 0} en línea ahora
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoreo por visitante único con ubicación, dispositivo y páginas recorridas
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de modo de vista */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLiveViewMode("unicos")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  liveViewMode === "unicos"
                    ? "bg-white text-emerald-800 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Visitantes Únicos ({data?.ultimosVisitantes?.length ?? 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setLiveViewMode("eventos")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  liveViewMode === "eventos"
                    ? "bg-white text-brand shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Todos los Eventos ({data?.ultimasVisitas?.length ?? 0})</span>
              </button>
            </div>

            <span className="hidden md:inline text-[10px] text-slate-400 font-medium pl-2">
              {lastUpdated.toLocaleTimeString("es-VE")}
            </span>
          </div>
        </div>

        {/* MODO 1: VISITANTES ÚNICOS */}
        {liveViewMode === "unicos" && (
          <div>
            {data?.ultimosVisitantes && data.ultimosVisitantes.length > 0 ? (
              <div className="space-y-3">
                {data.ultimosVisitantes.map((v) => {
                  const isExpanded = expandedVisitorId === v.sessionId;
                  return (
                    <div
                      key={v.sessionId}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        v.isOnline
                          ? "bg-emerald-50/30 border-emerald-200 hover:border-emerald-300 shadow-xs"
                          : "bg-white border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        {/* Datos del visitante */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative ${
                            v.isOnline ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {v.dispositivo === "Móvil" ? (
                              <Smartphone className="w-5 h-5" />
                            ) : (
                              <Monitor className="w-5 h-5" />
                            )}
                            {v.isOnline && (
                              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                                {v.ciudad}, {v.estado}
                              </span>

                              {v.isOnline ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  En línea ahora
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {getElapsedTimeText(v.ultimaActividad)}
                                </span>
                              )}

                              <span className="text-[11px] text-slate-400 font-medium">
                                · {v.dispositivo} ({v.navegador})
                              </span>

                              {v.esHumano === false ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  🤖 Bot / Servidor
                                </span>
                              ) : (v.totalPaginasVistas >= 2 || (v.productosVistos && v.productosVistos.length > 0)) ? (
                                <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                  🔥 Cliente Activo
                                </span>
                              ) : null}
                            </div>

                            {/* Actividad actual */}
                            <div className="text-slate-600 text-xs flex items-center gap-2">
                              {v.ultimoProductoNombre ? (
                                <span className="text-purple-800 font-semibold flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span>Ficha de producto: <strong className="text-slate-900">{v.ultimoProductoNombre}</strong> ({v.ultimoProductoSku})</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Página actual: <strong className="font-mono text-slate-800">{v.ultimaRuta}</strong></span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Métricas y botón expandir historial */}
                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold" title="Total de pantallas o páginas visitadas en esta sesión">
                              📄 {v.totalPaginasVistas} pág{v.totalPaginasVistas !== 1 ? "s" : ""}
                            </span>
                            {v.productosVistos && v.productosVistos.length > 0 && (
                              <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold border border-purple-200" title="Catálogo consultado">
                                📦 {v.productosVistos.length} prod{v.productosVistos.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {v.historial && v.historial.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setExpandedVisitorId(isExpanded ? null : v.sessionId)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                isExpanded
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span>Recorrido</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Historial desplegable / Recorrido del visitante */}
                      {isExpanded && v.historial && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 bg-slate-50/70 p-3 rounded-xl space-y-2">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            Recorrido del visitante en esta sesión ({v.historial.length} pasos):
                          </p>
                          <div className="space-y-1.5 pl-2 border-l-2 border-emerald-400">
                            {v.historial.map((h, i) => (
                              <div key={i} className="flex items-center justify-between text-xs gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  {h.productoNombre ? (
                                    <span className="text-purple-900 font-medium">
                                      Vio producto: <strong className="font-bold">{h.productoNombre}</strong> ({h.productoSku})
                                    </span>
                                  ) : (
                                    <span className="text-slate-700">
                                      Visitó: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{h.ruta}</code>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(h.hora).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-xs text-slate-400">No hay visitantes registrados en este período.</p>
            )}
          </div>
        )}

        {/* MODO 2: TODOS LOS EVENTOS RAW */}
        {liveViewMode === "eventos" && (
          <div>
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
        )}
      </div>

    </div>
  </div>
  );
}
