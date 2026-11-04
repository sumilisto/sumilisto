"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin } from "@/lib/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { GrillaItem, GrillaCanal, GrillaDia, FormatoContenido } from "@/types/grilla";
import { getDefaultGrillaItems } from "@/lib/grilla/defaults";
import { Product } from "@/types/product";
import {
  Calendar,
  CheckCircle2,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  Store,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Lock,
  User,
  Filter,
  Share2,
  CheckSquare,
  Flame,
  Save,
  TrendingUp,
  BarChart3,
  Target,
  Lightbulb,
} from "lucide-react";

export default function AdminGrillaPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");

  // Navigation tab: diaria | semanal | mensual | meta_analisis
  const [activeTab, setActiveTab] = useState<"diaria" | "semanal" | "mensual" | "meta_analisis">("diaria");

  // Grilla state
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [items, setItems] = useState<GrillaItem[]>([]);
  const [notasGenerales, setNotasGenerales] = useState<string>("");
  const [historial, setHistorial] = useState<Record<string, GrillaDia>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filters & Products
  const [selectedCanal, setSelectedCanal] = useState<
    "todos" | "publicaciones" | "historias" | GrillaCanal | "pendientes"
  >("todos");
  const [products, setProducts] = useState<Product[]>([]);

  // 1. Helper para clasificar Historia vs Publicación
  const isHistoria = (item: GrillaItem): boolean => {
    if (item.formatoTipo === "historia") return true;
    if (item.formatoTipo === "publicacion") return false;
    return Boolean(item.tipo?.toLowerCase().includes("historia"));
  };

  // 2. Verificar autenticación al inicio
  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) {
        loadGrilla(selectedDate);
        loadProducts();
      }
    });
  }, []);

  // 3. Cargar productos del catálogo
  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data || []);
      }
    } catch (e) {
      console.warn("No se pudieron cargar los productos:", e);
    }
  };

  // 4. Cargar grilla para una fecha dada
  const loadGrilla = async (fecha: string) => {
    try {
      setLoading(true);
      setHasUnsavedChanges(false);
      const res = await fetch(`/api/grilla?fecha=${fecha}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || getDefaultGrillaItems(fecha));
        setNotasGenerales(data.notasGenerales || "");
        if (data.historial) {
          setHistorial(data.historial);
        }
      } else {
        setItems(getDefaultGrillaItems(fecha));
      }
    } catch (e) {
      console.error("Error al cargar la grilla:", e);
      setItems(getDefaultGrillaItems(fecha));
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    if (newDate === selectedDate) return;
    if (hasUnsavedChanges) {
      if (!confirm("Tienes cambios sin guardar en este día. ¿Deseas cambiar de fecha?")) {
        return;
      }
    }
    setSelectedDate(newDate);
    loadGrilla(newDate);
  };

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split("T")[0];
    handleDateChange(newDateStr);
  };

  // 5. Guardar cambios
  const handleSave = async (itemsToSave = items, notasToSave = notasGenerales) => {
    try {
      setSaving(true);
      const res = await fetch("/api/grilla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: selectedDate,
          items: itemsToSave,
          notasGenerales: notasToSave,
        }),
      });

      if (res.ok) {
        setHasUnsavedChanges(false);
        setSaveSuccessMsg("¡Grilla guardada exitosamente!");
        setHistorial((prev) => ({
          ...prev,
          [selectedDate]: {
            fecha: selectedDate,
            items: itemsToSave,
            notasGenerales: notasToSave,
            updatedAt: new Date().toISOString(),
          },
        }));
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } else {
        alert("Error al guardar la grilla. Intente nuevamente.");
      }
    } catch (e) {
      console.error("Error al guardar:", e);
      alert("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // 6. Manejar Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const ok = await loginAdmin(usernameInput, passwordInput);
      if (ok) {
        setIsAuthenticated(true);
        loadGrilla(selectedDate);
        loadProducts();
      } else {
        setAuthError("Usuario o contraseña incorrectos.");
      }
    } catch {
      setAuthError("Error al iniciar sesión.");
    } finally {
      setLoggingIn(false);
    }
  };

  // 7. Acciones sobre items de la grilla
  const toggleItemCompleted = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const next = !item.completada;
        return {
          ...item,
          completada: next,
          completadaAt: next
            ? new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
            : undefined,
        };
      }
      return item;
    });
    setItems(updated);
    setHasUnsavedChanges(true);
    handleSave(updated, notasGenerales);
  };

  const updateItemField = (id: string, field: keyof GrillaItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    setHasUnsavedChanges(true);
  };

  const handleSelectProduct = (itemId: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      updateItemField(itemId, "productoId", undefined);
      updateItemField(itemId, "productoNombre", undefined);
      updateItemField(itemId, "productoImagen", undefined);
      updateItemField(itemId, "productoCategoria", undefined);
      return;
    }

    const firstPhoto = prod.fotos?.[0]?.url || "";
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          productoId: prod.id,
          productoNombre: prod.nombre,
          productoImagen: firstPhoto,
          productoCategoria: prod.categoria,
          titulo: prod.nombre,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleResetToDefaults = () => {
    if (confirm("¿Restablecer las 6 publicaciones y 4 historias de este día al orden recomendado?")) {
      const defaults = getDefaultGrillaItems(selectedDate);
      setItems(defaults);
      setHasUnsavedChanges(true);
      handleSave(defaults, notasGenerales);
    }
  };

  const handleAddNewSlot = (canal: GrillaCanal, formato: FormatoContenido) => {
    const isHist = formato === "historia";
    const sameFormatItems = items.filter((i) => (isHist ? isHistoria(i) : !isHistoria(i)));
    const newSlotNumber = sameFormatItems.length + 1;
    const newItem: GrillaItem = {
      id: `${selectedDate}-${canal}-${Date.now()}`,
      canal,
      formatoTipo: formato,
      slotNumber: newSlotNumber,
      tipo: isHist
        ? `Historia Adicional #${newSlotNumber}: Producto / Promoción`
        : `Publicación Adicional ${canal.toUpperCase()} #${newSlotNumber}`,
      hora: isHist ? "02:00 PM" : "12:00 PM",
      titulo: isHist ? "Historia Extra" : `Publicación Extra ${canal}`,
      completada: false,
    };
    setItems((prev) => [...prev, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm("¿Eliminar este slot de la grilla?")) {
      const updated = items.filter((i) => i.id !== id);
      setItems(updated);
      setHasUnsavedChanges(true);
      handleSave(updated, notasGenerales);
    }
  };

  // 8. Cálculos diarios (6 Publicaciones y 4 Historias)
  const totalItems = items.length;
  const completadas = items.filter((i) => i.completada).length;
  const percent = totalItems > 0 ? Math.round((completadas / totalItems) * 100) : 0;

  const publicaciones = items.filter((i) => !isHistoria(i));
  const historias = items.filter((i) => isHistoria(i));

  const pubDone = publicaciones.filter((i) => i.completada).length;
  const histDone = historias.filter((i) => i.completada).length;

  const igItems = items.filter((i) => i.canal === "instagram");
  const igDone = igItems.filter((i) => i.completada).length;

  const mlItems = items.filter((i) => i.canal === "mercadolibre");
  const mlDone = mlItems.filter((i) => i.completada).length;

  const fbItems = items.filter((i) => i.canal === "facebook");
  const fbDone = fbItems.filter((i) => i.completada).length;

  const filteredItems = useMemo(() => {
    if (selectedCanal === "todos") return items;
    if (selectedCanal === "publicaciones") return items.filter((i) => !isHistoria(i));
    if (selectedCanal === "historias") return items.filter((i) => isHistoria(i));
    if (selectedCanal === "pendientes") return items.filter((i) => !i.completada);
    return items.filter((i) => i.canal === selectedCanal);
  }, [items, selectedCanal]);

  const formattedDateTitle = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // 9. Cálculos Semanales (Lunes a Domingo)
  const weeklyData = useMemo(() => {
    const current = new Date(selectedDate + "T12:00:00");
    const dayOfWeek = current.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);

    const days = [];
    let weekTotalDone = 0;
    let weekTotalPubs = 0;
    let weekTotalHists = 0;
    let weekTotalTarget = 0;
    const productFrequency: Record<string, { count: number; name: string; img?: string }> = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const diaObj = historial[dateStr];
      const dayItems: GrillaItem[] = diaObj?.items || (dateStr === selectedDate ? items : []);

      const dayPubs = dayItems.filter((it) => !isHistoria(it) && it.completada).length;
      const dayHists = dayItems.filter((it) => isHistoria(it) && it.completada).length;
      const doneTotal = dayPubs + dayHists;

      dayItems.forEach((it) => {
        if (it.completada && it.productoNombre) {
          const key = it.productoNombre;
          if (!productFrequency[key]) {
            productFrequency[key] = { count: 0, name: it.productoNombre, img: it.productoImagen };
          }
          productFrequency[key].count += 1;
        }
      });

      weekTotalDone += doneTotal;
      weekTotalPubs += dayPubs;
      weekTotalHists += dayHists;
      weekTotalTarget += 10;

      days.push({
        dateStr,
        dayName: d.toLocaleDateString("es-VE", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        doneTotal,
        dayPubs,
        dayHists,
        percent: Math.min(100, Math.round((doneTotal / 10) * 100)),
      });
    }

    const topProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      days,
      weekTotalDone,
      weekTotalPubs,
      weekTotalHists,
      weekTotalTarget,
      weekPercent: Math.round((weekTotalDone / weekTotalTarget) * 100),
      topProducts,
    };
  }, [selectedDate, historial, items, todayStr]);

  // 10. Cálculos Mensuales
  const monthlyData = useMemo(() => {
    const [yearStr, monthStr] = selectedDate.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();

    let monthTotalDone = 0;
    let monthPubs = 0;
    let monthHists = 0;
    let igTotal = 0;
    let mlTotal = 0;
    let fbTotal = 0;
    let daysWithActivity = 0;
    const monthProducts: Record<string, { count: number; name: string; img?: string }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, "0");
      const dateStr = `${yearStr}-${monthStr}-${dayFormatted}`;
      const diaObj = historial[dateStr];
      const dayItems: GrillaItem[] = diaObj?.items || (dateStr === selectedDate ? items : []);

      const dayPubs = dayItems.filter((it) => !isHistoria(it) && it.completada).length;
      const dayHists = dayItems.filter((it) => isHistoria(it) && it.completada).length;
      const sumDay = dayPubs + dayHists;

      const igDay = dayItems.filter((it) => it.canal === "instagram" && it.completada).length;
      const mlDay = dayItems.filter((it) => it.canal === "mercadolibre" && it.completada).length;
      const fbDay = dayItems.filter((it) => it.canal === "facebook" && it.completada).length;

      if (sumDay > 0) {
        daysWithActivity += 1;
        monthTotalDone += sumDay;
        monthPubs += dayPubs;
        monthHists += dayHists;
        igTotal += igDay;
        mlTotal += mlDay;
        fbTotal += fbDay;
      }

      dayItems.forEach((it) => {
        if (it.completada && it.productoNombre) {
          const key = it.productoNombre;
          if (!monthProducts[key]) {
            monthProducts[key] = { count: 0, name: it.productoNombre, img: it.productoImagen };
          }
          monthProducts[key].count += 1;
        }
      });
    }

    const monthlyTarget = daysInMonth * 10;
    const topMonthProducts = Object.values(monthProducts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      monthName: new Date(year, month - 1, 1).toLocaleDateString("es-VE", {
        month: "long",
        year: "numeric",
      }),
      monthTotalDone,
      monthPubs,
      monthHists,
      monthlyTarget,
      monthPercent: Math.round((monthTotalDone / monthlyTarget) * 100),
      igTotal,
      mlTotal,
      fbTotal,
      daysWithActivity,
      daysInMonth,
      averageDaily: daysWithActivity > 0 ? (monthTotalDone / daysWithActivity).toFixed(1) : "0",
      topMonthProducts,
    };
  }, [selectedDate, historial, items]);

  // 11. Meta Professional Analysis Engine (Fórmula 6 Publicaciones + 4 Historias)
  const metaAudit = useMemo(() => {
    const weeklyRate = weeklyData.weekPercent;
    const { weekTotalDone, weekTotalPubs, weekTotalHists } = weeklyData;

    let score = Math.round(weeklyRate * 0.8);
    if (weekTotalPubs >= 25) score += 10;
    if (weekTotalHists >= 18) score += 10;
    score = Math.min(100, Math.max(10, score));

    let nivel = "En Inicio";
    let badgeColor = "bg-slate-100 text-slate-700";
    if (score >= 80) {
      nivel = "Nivel Élite / Crecimiento Acelerado";
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
    } else if (score >= 55) {
      nivel = "Ritmo Constante / Crecimiento Estable";
      badgeColor = "bg-blue-100 text-blue-800 border-blue-300";
    } else {
      nivel = "Frecuencia Intermitente";
      badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
    }

    return {
      score,
      nivel,
      badgeColor,
      weekTotalDone,
      weekTotalPubs,
      weekTotalHists,
      isPubsStrong: weekTotalPubs >= 25,
      isHistsStrong: weekTotalHists >= 16,
    };
  }, [weeklyData]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner">
              <Calendar className="w-7 h-7 text-emerald-700" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-slate-900 text-center tracking-tight">
            Grilla de Publicaciones
          </h1>
          <p className="text-slate-500 text-xs text-center mt-1 mb-6">
            Meta diaria: 6 Publicaciones fijas + 4 Historias
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-900"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-900"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Accediendo...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Ingresar a la Grilla</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Barra de Navegación del Administrador */}
      <AdminNav onLogout={() => setIsAuthenticated(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Pestañas Principales de Navegación */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("diaria")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === "diaria"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Grilla Diaria</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-700 text-white font-mono">
                {completadas}/10
              </span>
            </button>

            <button
              onClick={() => setActiveTab("semanal")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === "semanal"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Resumen Semanal</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
                {weeklyData.weekPercent}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab("mensual")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === "mensual"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Resumen Mensual</span>
            </button>

            <button
              onClick={() => setActiveTab("meta_analisis")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === "meta_analisis"
                  ? "bg-gradient-to-r from-purple-700 via-pink-600 to-amber-600 text-white shadow-sm"
                  : "text-purple-700 hover:bg-purple-50 border border-purple-200"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Análisis & Recomendaciones Meta Pro</span>
            </button>
          </div>

          {/* Selector Rápido de Fecha */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
            />
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            PESTAÑA 1: GRILLA DIARIA ÁGIL (6 PUBLICACIONES + 4 HISTORIAS)
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "diaria" && (
          <div>
            {/* Cabecera y Resumen de la Jornada */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight capitalize">
                      {formattedDateTitle}
                    </h1>
                    {selectedDate === todayStr && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        HOY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Meta diaria: <strong>6 Publicaciones</strong> (Reel, Feed, ML, Marketplace) + <strong>4 Historias</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                      hasUnsavedChanges
                        ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                        : "bg-emerald-700 hover:bg-emerald-800 text-white"
                    }`}
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{hasUnsavedChanges ? "Guardar Cambios *" : "Guardado"}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleResetToDefaults}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium"
                    title="Restablecer plantilla horaria (6 publicaciones y 4 historias)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="mt-3 py-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Tarjetas de Cuotas: 6 Publicaciones + 4 Historias + Progreso */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {/* Publicaciones */}
                  <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                      📌 Publicaciones (Meta: 6)
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-emerald-950">{pubDone}</span>
                      <span className="text-xs font-semibold text-emerald-700">/ 6 completadas</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      Feed, Reels, ML, Marketplace
                    </span>
                  </div>

                  {/* Historias */}
                  <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-200/80">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block flex items-center gap-1">
                      ⏱️ Historias (Meta: 4)
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-purple-950">{histDone}</span>
                      <span className="text-xs font-semibold text-purple-700">/ 4 completadas</span>
                    </div>
                    <span className="text-[10px] text-purple-600 block mt-0.5">
                      Stories Instagram espaciadas
                    </span>
                  </div>

                  {/* Total Diario */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Cumplido
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-slate-900">{completadas}</span>
                      <span className="text-xs font-semibold text-slate-400">/ {totalItems}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-bold">
                      {percent}% de la meta del día
                    </span>
                  </div>

                  {/* Por Canal */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Desglose por Canal
                    </span>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 py-0.5">
                      <span>📸 Instagram:</span>
                      <span className="font-bold text-pink-700">{igDone} / 6</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 py-0.5">
                      <span>💛 MercadoLibre:</span>
                      <span className="font-bold text-amber-800">{mlDone} / 2</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 py-0.5">
                      <span>💙 Marketplace:</span>
                      <span className="font-bold text-blue-700">{fbDone} / 2</span>
                    </div>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percent === 100
                        ? "bg-emerald-500"
                        : percent >= 50
                        ? "bg-emerald-600"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              <button
                onClick={() => setSelectedCanal("todos")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  selectedCanal === "todos"
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Todos ({totalItems})
              </button>
              <button
                onClick={() => setSelectedCanal("publicaciones")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  selectedCanal === "publicaciones"
                    ? "bg-emerald-700 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                📌 Publicaciones ({pubDone}/6)
              </button>
              <button
                onClick={() => setSelectedCanal("historias")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  selectedCanal === "historias"
                    ? "bg-purple-700 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ⏱️ Historias ({histDone}/4)
              </button>
              <button
                onClick={() => setSelectedCanal("instagram")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  selectedCanal === "instagram"
                    ? "bg-pink-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Instagram ({igDone}/6)
              </button>
              <button
                onClick={() => setSelectedCanal("mercadolibre")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  selectedCanal === "mercadolibre"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                MercadoLibre ({mlDone}/2)
              </button>
              <button
                onClick={() => setSelectedCanal("facebook")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  selectedCanal === "facebook"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                FB Marketplace ({fbDone}/2)
              </button>
              <button
                onClick={() => setSelectedCanal("pendientes")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  selectedCanal === "pendientes"
                    ? "bg-amber-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Pendientes ({totalItems - completadas})
              </button>
            </div>

            {/* Lista Cronológica: DOBLE LÍNEA para leer el mensaje completo sin truncar */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isIg = item.canal === "instagram";
                const isMl = item.canal === "mercadolibre";
                const isFb = item.canal === "facebook";
                const itemIsHist = isHistoria(item);

                const badgeBg = isIg
                  ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white"
                  : isMl
                  ? "bg-[#FFE600] text-blue-950 font-black border border-amber-300"
                  : "bg-[#1877F2] text-white";

                const canalName = isIg ? "Instagram" : isMl ? "MercadoLibre" : "Marketplace";
                const directUrl = isIg
                  ? "https://www.instagram.com/sumilisto_/"
                  : isMl
                  ? "https://www.mercadolibre.com.ve"
                  : "https://www.facebook.com/marketplace";

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                      item.completada ? "bg-emerald-50/30" : "hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Izquierda: Checkbox + Hora + Canal + Formato Badge (Publicación / Historia) + Texto en DOBLE LÍNEA COMPLETA */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Checkbox de Publicado */}
                      <button
                        onClick={() => toggleItemCompleted(item.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                          item.completada
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white border-2 border-slate-300 hover:border-emerald-500 text-transparent"
                        }`}
                        title={item.completada ? "Marcar como pendiente" : "Marcar como publicado"}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      {/* Hora de publicación */}
                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={item.hora}
                          onChange={(e) => updateItemField(item.id, "hora", e.target.value)}
                          placeholder="08:00 AM"
                          className="bg-transparent text-xs font-bold text-slate-800 w-16 focus:outline-none"
                        />
                      </div>

                      {/* Canal Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-xs ${badgeBg}`}>
                        {canalName}
                      </span>

                      {/* Badge Formato: Publicación vs Historia */}
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                          itemIsHist
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {itemIsHist ? "Historia" : "Publicación"}
                      </span>

                      {/* Mensaje / Tipo en DOBLE LÍNEA (Sin truncar, lectura completa) */}
                      <div
                        className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 max-w-[260px] sm:max-w-md break-words"
                        title={item.tipo}
                      >
                        {item.tipo}
                      </div>
                    </div>

                    {/* Centro: Selector de Producto Publicado */}
                    <div className="w-full md:w-auto md:min-w-[260px] md:max-w-xs flex items-center gap-2 shrink-0">
                      {item.productoImagen ? (
                        <img
                          src={item.productoImagen}
                          alt="Producto"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <select
                          value={item.productoId || ""}
                          onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                          className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                        >
                          <option value="">-- Vincular Producto --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.categoria})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Derecha: Estado + Enlace directo + Eliminar */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {item.completada ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Publicado {item.completadaAt && `(${item.completadaAt})`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Pendiente
                        </span>
                      )}

                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title={`Abrir ${canalName}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleDeleteSlot(item.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar este slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Añadir slots adicionales */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handleAddNewSlot("instagram", "publicacion")}
                className="px-3 py-1.5 bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> + Publicación IG (Feed/Reel)
              </button>
              <button
                onClick={() => handleAddNewSlot("instagram", "historia")}
                className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> + Historia IG Extra
              </button>
              <button
                onClick={() => handleAddNewSlot("mercadolibre", "publicacion")}
                className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> + Publicación MercadoLibre
              </button>
              <button
                onClick={() => handleAddNewSlot("facebook", "publicacion")}
                className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> + Publicación Marketplace
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            PESTAÑA 2: RESUMEN SEMANAL
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "semanal" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-700" />
                    Resumen Semanal de Publicaciones e Historias
                  </h2>
                  <p className="text-xs text-slate-500">
                    Semana del {weeklyData.days[0]?.dateStr} al {weeklyData.days[6]?.dateStr}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Publicaciones</span>
                    <span className="text-base font-black text-emerald-950">
                      {weeklyData.weekTotalPubs} <span className="text-xs font-normal">/ 42 semanal</span>
                    </span>
                  </div>
                  <div className="bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Historias</span>
                    <span className="text-base font-black text-purple-950">
                      {weeklyData.weekTotalHists} <span className="text-xs font-normal">/ 28 semanal</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Matriz 7 Días */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
                {weeklyData.days.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      handleDateChange(day.dateStr);
                      setActiveTab("diaria");
                    }}
                    className={`cursor-pointer rounded-xl p-3 border transition-all ${
                      day.isSelected
                        ? "ring-2 ring-emerald-600 border-emerald-500 bg-emerald-50/40"
                        : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-700 uppercase">
                        {day.dayName} {day.dayNum}
                      </span>
                      {day.isToday && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-700 text-white">
                          HOY
                        </span>
                      )}
                    </div>

                    <div className="text-center my-2">
                      <span className="text-2xl font-black text-slate-900">{day.doneTotal}</span>
                      <span className="text-xs text-slate-400 font-semibold block">/ 10 meta</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${day.percent}%` }}
                      />
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-600 font-medium pt-2 border-t border-slate-200/60">
                      <div className="flex justify-between">
                        <span>📌 Publicaciones:</span>
                        <span className="font-bold text-emerald-800">{day.dayPubs}/6</span>
                      </div>
                      <div className="flex justify-between">
                        <span>⏱️ Historias:</span>
                        <span className="font-bold text-purple-800">{day.dayHists}/4</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Productos Más Publicados en la Semana */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Productos con Mayor Frecuencia de Publicación esta Semana
              </h3>

              {weeklyData.topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Aún no has vinculado productos publicados en los slots de esta semana.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {weeklyData.topProducts.map((p, idx) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      {p.img && (
                        <img
                          src={p.img}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 block truncate" title={p.name}>
                          {p.name}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-bold">
                          {p.count} publicaciones esta semana
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            PESTAÑA 3: RESUMEN MENSUAL Y ESTADÍSTICAS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "mensual" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900 capitalize flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-700" />
                    Estadísticas del Mes ({monthlyData.monthName})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Seguimiento de volumen: Publicaciones permanentes vs Historias de 24h
                  </p>
                </div>
              </div>

              {/* Tarjetas de Métricas Mensuales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block uppercase">Total Contenidos</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                    {monthlyData.monthTotalDone}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Meta mensual: ~{monthlyData.monthlyTarget}
                  </span>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 block uppercase">📌 Publicaciones</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1 block">
                    {monthlyData.monthPubs}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">Feed, Reels, ML, Marketplace</span>
                </div>

                <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-200">
                  <span className="text-xs font-bold text-purple-800 block uppercase">⏱️ Historias</span>
                  <span className="text-2xl sm:text-3xl font-black text-purple-900 mt-1 block">
                    {monthlyData.monthHists}
                  </span>
                  <span className="text-[11px] text-purple-700 font-medium">Stories Instagram 24h</span>
                </div>

                <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200">
                  <span className="text-xs font-bold text-amber-900 block uppercase">Días Activos</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-950 mt-1 block">
                    {monthlyData.daysWithActivity}
                  </span>
                  <span className="text-[11px] text-amber-800 font-medium">
                    Promedio: {monthlyData.averageDaily} al día
                  </span>
                </div>
              </div>

              {/* Distribución por Canal */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Distribución de Presencia por Canal en el Mes
                </h3>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  {monthlyData.monthTotalDone > 0 ? (
                    <>
                      <div
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-full"
                        style={{
                          width: `${(monthlyData.igTotal / monthlyData.monthTotalDone) * 100}%`,
                        }}
                        title={`Instagram: ${monthlyData.igTotal}`}
                      />
                      <div
                        className="bg-[#FFE600] h-full"
                        style={{
                          width: `${(monthlyData.mlTotal / monthlyData.monthTotalDone) * 100}%`,
                        }}
                        title={`MercadoLibre: ${monthlyData.mlTotal}`}
                      />
                      <div
                        className="bg-[#1877F2] h-full"
                        style={{
                          width: `${(monthlyData.fbTotal / monthlyData.monthTotalDone) * 100}%`,
                        }}
                        title={`Facebook Marketplace: ${monthlyData.fbTotal}`}
                      />
                    </>
                  ) : (
                    <div className="bg-slate-200 w-full h-full" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs mt-2 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-pink-600" />
                    <span>Instagram: {monthlyData.igTotal}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span>MercadoLibre: {monthlyData.mlTotal}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span>FB Marketplace: {monthlyData.fbTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking de Productos del Mes */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                Catálogo: Productos Más Promocionados en el Mes
              </h3>

              {monthlyData.topMonthProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No hay productos registrados en las publicaciones de este mes todavía.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {monthlyData.topMonthProducts.map((p, idx) => (
                    <div key={p.name} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>
                        {p.img ? (
                          <img
                            src={p.img}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover bg-slate-50 border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-800">{p.name}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {p.count} veces publicado
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            PESTAÑA 4: ANÁLISIS & RECOMENDACIONES META PRO
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "meta_analisis" && (
          <div className="space-y-6">
            {/* Tarjeta de Puntuación Algorítmica */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Especialista Meta Ads & Crecimiento B2B</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Fórmula Estratégica: 6 Publicaciones + 4 Historias
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                    La combinación exacta entre <strong>adquisición de nuevos clientes</strong> (Feed, Reels y Marketplaces) y <strong>frecuencia de recordación</strong> (Historias).
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center min-w-[200px]">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-200 uppercase block">
                    Score de Consistencia Meta
                  </span>
                  <div className="text-4xl font-black text-white mt-1">
                    {metaAudit.score} <span className="text-lg font-normal text-emerald-300">/ 100</span>
                  </div>
                  <span
                    className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${metaAudit.badgeColor}`}
                  >
                    {metaAudit.nivel}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnóstico según tu frecuencia actual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Publicaciones (Meta: 6/día) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    📌
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase">
                      6 Publicaciones Fijas Diarias (Tracción Permanente)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Esta semana: <strong>{metaAudit.weekTotalPubs}</strong> de 42 recomendadas
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Las publicaciones (Reels en Instagram, posts en Feed, listings en MercadoLibre y Facebook Marketplace) tienen <strong>vida útil prolongada e indexación en motores de búsqueda</strong>.
                  <br />
                  <br />
                  • <strong>1 Reel Diario:</strong> Llega a usuarios que aún no te siguen en Caracas y Miranda.
                  <br />
                  • <strong>1 Post Feed / Carrusel:</strong> Ficha técnica guardable con medidas y precios oficiales.
                  <br />
                  • <strong>2 Marketplace:</strong> Capturan compras inmediatas de personas buscando cajas, vasos y bolsas hoy.
                  <br />
                  • <strong>2 MercadoLibre:</strong> Indexan en Google y MercadoLibre para ventas por bulto cerrado.
                </p>
              </div>

              {/* Historias (Meta: 4/día) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                    ⏱️
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase">
                      4 Historias Diarias (Frecuencia & Cierres WhatsApp)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Esta semana: <strong>{metaAudit.weekTotalHists}</strong> de 28 recomendadas
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Las historias duran 24 horas y tienen como objetivo el algoritmo de <strong>Tray Bubble Priority</strong>:
                  <br />
                  <br />
                  • <strong>Espaciadas cada 3 a 4 horas:</strong> Cada vez que subes una historia, el círculo de Sumilisto salta al primer lugar de la bandeja de historias de tus seguidores.
                  <br />
                  • <strong>Estructura recomendada:</strong>
                  <br />
                  - <em>08:00 AM:</em> Apertura y stock disponible.
                  <br />
                  - <em>11:30 AM:</em> Escala de descuento por bulto al Gran Mayor.
                  <br />
                  - <em>07:00 PM:</em> Recordatorio de rutas de despacho del día siguiente.
                  <br />
                  - <em>08:30 PM:</em> Cierre, métodos de pago (Pago Móvil, Zelle, efectivo) y WhatsApp directo.
                </p>
              </div>
            </div>

            {/* 5 Recomendaciones Tácticas */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Reglas de Oro de un Media Buyer para Escalar Sumilisto
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Stickers de Enlace en las 4 Historias</h4>
                    <p className="text-slate-500 mt-0.5">
                      Nunca publiques una historia sin un sticker con enlace directo a WhatsApp (<code>wa.me/584227864547</code>) o al catálogo web. El 60% de los comerciantes prefiere tocar un botón directo antes que escribir un DM.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Marketplace: Ubicaciones Rotativas</h4>
                    <p className="text-slate-500 mt-0.5">
                      Publicación 1 en Caracas (Chacao/Sucre) a las 09:00 AM y Publicación 2 en Guarenas/Guatire a las 03:00 PM. Esto amplía tu radio geográfico sin que el algoritmo marque tu anuncio como listing duplicado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Títulos con Intención de Compra en MercadoLibre</h4>
                    <p className="text-slate-500 mt-0.5">
                      Incluye siempre: <em>[Producto] + [Medida] + [Al Mayor / Por Bulto] + [Sumilisto Caracas]</em>. Los compradores que buscan comprar volumen filtran con la palabra "bulto".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
