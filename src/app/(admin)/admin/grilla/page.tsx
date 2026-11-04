"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin } from "@/lib/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { GrillaItem, GrillaCanal, GrillaDia } from "@/types/grilla";
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
  Award,
  Zap,
  Target,
  Lightbulb,
  ArrowUpRight,
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
  const [selectedCanal, setSelectedCanal] = useState<"todos" | GrillaCanal | "pendientes">("todos");
  const [products, setProducts] = useState<Product[]>([]);

  // 1. Verificar autenticación al inicio
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

  // 2. Cargar productos del catálogo
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

  // 3. Cargar grilla para una fecha dada
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

  // 4. Guardar cambios
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
        // Actualizar historial local
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

  // 5. Manejar Login
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

  // 6. Acciones sobre items de la grilla
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
    if (confirm("¿Restablecer las 10 publicaciones de este día al orden cronológico recomendado?")) {
      const defaults = getDefaultGrillaItems(selectedDate);
      setItems(defaults);
      setHasUnsavedChanges(true);
      handleSave(defaults, notasGenerales);
    }
  };

  const handleAddNewSlot = (canal: GrillaCanal) => {
    const canalItems = items.filter((i) => i.canal === canal);
    const newSlotNumber = canalItems.length + 1;
    const newItem: GrillaItem = {
      id: `${selectedDate}-${canal}-${Date.now()}`,
      canal,
      slotNumber: newSlotNumber,
      tipo: `Publicación Adicional ${canal.toUpperCase()} #${newSlotNumber}`,
      hora: "12:00 PM",
      titulo: `Publicación Extra ${canal}`,
      completada: false,
    };
    setItems((prev) => [...prev, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm("¿Eliminar este slot de publicación?")) {
      const updated = items.filter((i) => i.id !== id);
      setItems(updated);
      setHasUnsavedChanges(true);
      handleSave(updated, notasGenerales);
    }
  };

  // 7. Cálculos diarios
  const totalItems = items.length;
  const completadas = items.filter((i) => i.completada).length;
  const percent = totalItems > 0 ? Math.round((completadas / totalItems) * 100) : 0;

  const igItems = items.filter((i) => i.canal === "instagram");
  const igDone = igItems.filter((i) => i.completada).length;

  const mlItems = items.filter((i) => i.canal === "mercadolibre");
  const mlDone = mlItems.filter((i) => i.completada).length;

  const fbItems = items.filter((i) => i.canal === "facebook");
  const fbDone = fbItems.filter((i) => i.completada).length;

  const filteredItems = useMemo(() => {
    if (selectedCanal === "todos") return items;
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

  // 8. Cálculos Semanales (Lunes a Domingo de la semana actual)
  const weeklyData = useMemo(() => {
    const current = new Date(selectedDate + "T12:00:00");
    const dayOfWeek = current.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);

    const days = [];
    let weekTotalDone = 0;
    let weekTotalTarget = 0;
    const productFrequency: Record<string, { count: number; name: string; img?: string }> = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const diaObj = historial[dateStr];
      const dayItems = diaObj?.items || (dateStr === selectedDate ? items : []);

      const igCount = dayItems.filter((it: any) => it.canal === "instagram" && it.completada).length;
      const mlCount = dayItems.filter((it: any) => it.canal === "mercadolibre" && it.completada).length;
      const fbCount = dayItems.filter((it: any) => it.canal === "facebook" && it.completada).length;
      const doneTotal = igCount + mlCount + fbCount;

      dayItems.forEach((it: any) => {
        if (it.completada && it.productoNombre) {
          const key = it.productoNombre;
          if (!productFrequency[key]) {
            productFrequency[key] = { count: 0, name: it.productoNombre, img: it.productoImagen };
          }
          productFrequency[key].count += 1;
        }
      });

      weekTotalDone += doneTotal;
      weekTotalTarget += 10;

      days.push({
        dateStr,
        dayName: d.toLocaleDateString("es-VE", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        doneTotal,
        igCount,
        mlCount,
        fbCount,
        percent: Math.min(100, Math.round((doneTotal / 10) * 100)),
      });
    }

    const topProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      days,
      weekTotalDone,
      weekTotalTarget,
      weekPercent: Math.round((weekTotalDone / weekTotalTarget) * 100),
      topProducts,
    };
  }, [selectedDate, historial, items, todayStr]);

  // 9. Cálculos Mensuales
  const monthlyData = useMemo(() => {
    const [yearStr, monthStr] = selectedDate.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();

    let monthTotalDone = 0;
    let igTotal = 0;
    let mlTotal = 0;
    let fbTotal = 0;
    let daysWithActivity = 0;
    const monthProducts: Record<string, { count: number; name: string; img?: string }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, "0");
      const dateStr = `${yearStr}-${monthStr}-${dayFormatted}`;
      const diaObj = historial[dateStr];
      const dayItems = diaObj?.items || (dateStr === selectedDate ? items : []);

      const igDoneDay = dayItems.filter((it: any) => it.canal === "instagram" && it.completada).length;
      const mlDoneDay = dayItems.filter((it: any) => it.canal === "mercadolibre" && it.completada).length;
      const fbDoneDay = dayItems.filter((it: any) => it.canal === "facebook" && it.completada).length;
      const sumDay = igDoneDay + mlDoneDay + fbDoneDay;

      if (sumDay > 0) {
        daysWithActivity += 1;
        monthTotalDone += sumDay;
        igTotal += igDoneDay;
        mlTotal += mlDoneDay;
        fbTotal += fbDoneDay;
      }

      dayItems.forEach((it: any) => {
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
      monthName: new Date(year, month - 1, 1).toLocaleDateString("es-VE", { month: "long", year: "numeric" }),
      monthTotalDone,
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

  // 10. Meta Professional Analysis Engine
  const metaAudit = useMemo(() => {
    const weeklyRate = weeklyData.weekPercent; // 0 to 100
    const weeklyPosts = weeklyData.weekTotalDone;
    const igWeekly = weeklyData.days.reduce((acc, d) => acc + d.igCount, 0);
    const fbWeekly = weeklyData.days.reduce((acc, d) => acc + d.fbCount, 0);
    const mlWeekly = weeklyData.days.reduce((acc, d) => acc + d.mlCount, 0);

    // Score calculado sobre 100 basado en consistencia, balance multicanal y volumen
    let score = Math.round(weeklyRate * 0.85);
    if (igWeekly >= 30) score += 5;
    if (fbWeekly >= 10) score += 5;
    if (mlWeekly >= 10) score += 5;
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
      weeklyPosts,
      igWeekly,
      fbWeekly,
      mlWeekly,
      isIgStrong: igWeekly >= 25,
      isFbStrong: fbWeekly >= 8,
      isMlStrong: mlWeekly >= 8,
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
            Planificador ágil: Hora, Producto, Resumen y Auditoría Meta
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

          {/* Quick Date Switcher in Header */}
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
            PESTAÑA 1: GRILLA DIARIA ÁGIL (HORA + PRODUCTO)
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
                    Orden cronológico óptimo para comercio en Venezuela · Marca tus publicaciones con 1 clic
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
                    title="Restablecer plantilla horaria recomendada"
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

              {/* Barra de Progreso y Cuotas */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Diario
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-slate-900">{completadas}</span>
                      <span className="text-xs font-semibold text-slate-400">/ {totalItems}</span>
                    </div>
                  </div>

                  <div className="bg-pink-50/50 rounded-xl p-2.5 border border-pink-200/70">
                    <span className="text-[10px] font-bold text-pink-700 uppercase tracking-wider block">
                      Instagram (Meta: 6)
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-pink-900">{igDone}</span>
                      <span className="text-xs font-semibold text-pink-400">/ 6</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 rounded-xl p-2.5 border border-amber-200/70">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      MercadoLibre (Meta: 2)
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-amber-950">{mlDone}</span>
                      <span className="text-xs font-semibold text-amber-500">/ 2</span>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 rounded-xl p-2.5 border border-blue-200/70">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      Marketplace (Meta: 2)
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-blue-900">{fbDone}</span>
                      <span className="text-xs font-semibold text-blue-400">/ 2</span>
                    </div>
                  </div>
                </div>

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
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              <button
                onClick={() => setSelectedCanal("todos")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedCanal === "todos"
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Todos ({totalItems})
              </button>
              <button
                onClick={() => setSelectedCanal("instagram")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedCanal === "instagram"
                    ? "bg-pink-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Instagram ({igDone}/6)
              </button>
              <button
                onClick={() => setSelectedCanal("mercadolibre")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedCanal === "mercadolibre"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                MercadoLibre ({mlDone}/2)
              </button>
              <button
                onClick={() => setSelectedCanal("facebook")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedCanal === "facebook"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                FB Marketplace ({fbDone}/2)
              </button>
              <button
                onClick={() => setSelectedCanal("pendientes")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedCanal === "pendientes"
                    ? "bg-amber-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Pendientes ({totalItems - completadas})
              </button>
            </div>

            {/* Lista Cronológica Ágil: Tabla / Timeline de Publicaciones */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {filteredItems.map((item, idx) => {
                const isIg = item.canal === "instagram";
                const isMl = item.canal === "mercadolibre";
                const isFb = item.canal === "facebook";

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
                    {/* Izquierda: Checkbox + Hora + Canal + Formato */}
                    <div className="flex items-center gap-3 min-w-[280px]">
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
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
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
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-xs ${badgeBg}`}>
                        {canalName}
                      </span>

                      {/* Tipo / Formato */}
                      <div className="text-xs font-semibold text-slate-700 truncate max-w-[200px]" title={item.tipo}>
                        {item.tipo}
                      </div>
                    </div>

                    {/* Centro: Selector de Producto Publicado */}
                    <div className="flex-1 flex items-center gap-2 max-w-lg">
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
                          <option value="">-- Seleccionar Producto Publicado --</option>
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
                onClick={() => handleAddNewSlot("instagram")}
                className="px-3 py-1.5 bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> + Instagram
              </button>
              <button
                onClick={() => handleAddNewSlot("mercadolibre")}
                className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> + MercadoLibre
              </button>
              <button
                onClick={() => handleAddNewSlot("facebook")}
                className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> + FB Marketplace
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            PESTAÑA 2: RESUMEN SEMANAL (MATRIZ LUNES A DOMINGO)
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "semanal" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-700" />
                    Resumen Semanal de Publicaciones
                  </h2>
                  <p className="text-xs text-slate-500">
                    Semana del {weeklyData.days[0]?.dateStr} al {weeklyData.days[6]?.dateStr}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-semibold block">Cumplimiento Semanal</span>
                    <span className="text-lg font-black text-emerald-700">
                      {weeklyData.weekTotalDone} / {weeklyData.weekTotalTarget} ({weeklyData.weekPercent}%)
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
                        <span>📸 IG:</span>
                        <span className="font-bold">{day.igCount}/6</span>
                      </div>
                      <div className="flex justify-between">
                        <span>💛 ML:</span>
                        <span className="font-bold">{day.mlCount}/2</span>
                      </div>
                      <div className="flex justify-between">
                        <span>💙 FB:</span>
                        <span className="font-bold">{day.fbCount}/2</span>
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
                  Aún no has registrado productos publicados en los slots de esta semana.
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
                        <img src={p.img} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0" />
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
                    Seguimiento acumulado de impacto y volumen comercial
                  </p>
                </div>
              </div>

              {/* Tarjetas de Métricas Mensuales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block uppercase">Total Publicaciones</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                    {monthlyData.monthTotalDone}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Meta mensual: ~{monthlyData.monthlyTarget}
                  </span>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 block uppercase">Promedio Diario</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1 block">
                    {monthlyData.averageDaily}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    En {monthlyData.daysWithActivity} días con actividad
                  </span>
                </div>

                <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-200">
                  <span className="text-xs font-bold text-purple-800 block uppercase">Instagram Acumulado</span>
                  <span className="text-2xl sm:text-3xl font-black text-purple-900 mt-1 block">
                    {monthlyData.igTotal}
                  </span>
                  <span className="text-[11px] text-purple-700 font-medium">Historias, Reels y Feed</span>
                </div>

                <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200">
                  <span className="text-xs font-bold text-amber-900 block uppercase">ML & Marketplace</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-950 mt-1 block">
                    {monthlyData.mlTotal + monthlyData.fbTotal}
                  </span>
                  <span className="text-[11px] text-amber-800 font-medium">
                    ML: {monthlyData.mlTotal} · FB: {monthlyData.fbTotal}
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
                    <span>Instagram: {monthlyData.igTotal} publicaciones</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span>MercadoLibre: {monthlyData.mlTotal} publicaciones</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span>FB Marketplace: {monthlyData.fbTotal} publicaciones</span>
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
                          <img src={p.img} alt={p.name} className="w-9 h-9 rounded-lg object-cover bg-slate-50 border border-slate-200" />
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
                    <span>Auditoría Algorítmica Meta Ads & Orgánico</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Diagnóstico de Frecuencia y Alcance Comercial
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                    Análisis técnico basado en el comportamiento real de tus publicaciones semanales vs los estándares de distribución algorítmica de Meta (Instagram + FB) y Marketplaces en Venezuela.
                  </p>
                </div>

                {/* Score Circular / Tarjeta */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center min-w-[200px]">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-200 uppercase block">
                    Score de Consistencia Meta
                  </span>
                  <div className="text-4xl font-black text-white mt-1">
                    {metaAudit.score} <span className="text-lg font-normal text-emerald-300">/ 100</span>
                  </div>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${metaAudit.badgeColor}`}>
                    {metaAudit.nivel}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnóstico según tu frecuencia actual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Instagram Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase">Instagram (Meta: 6/día)</h3>
                    <span className="text-[11px] text-slate-500">
                      Registradas esta semana: <strong>{metaAudit.igWeekly}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {metaAudit.isIgStrong
                    ? "🔥 Excelente cadencia. Publicar 6 veces al día activa el 'Tray Bubble Priority', manteniendo la burbuja de Sumilisto en la primera posición de historias de tus clientes potenciales cada vez que abren la app."
                    : "⚠️ Ritmo por debajo de la meta óptima. En B2B, las historias tienen una vida útil de 2 a 3 horas antes de que la competencia te empuje hacia atrás. Intenta mantener al menos 4 historias espaciadas."}
                </p>
              </div>

              {/* Facebook Marketplace Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase">Marketplace (Meta: 2/día)</h3>
                    <span className="text-[11px] text-slate-500">
                      Registradas esta semana: <strong>{metaAudit.fbWeekly}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {metaAudit.isFbStrong
                    ? "✅ Gran estrategia geográfica. 2 publicaciones al día evita el filtro de spam de listings repetidos de Facebook y te permite posicionar una en Caracas y otra en Guarenas-Guatire sin canibalizar búsquedas."
                    : "💡 Recomendación: Marketplace es el mayor canal de búsqueda por cercanía en Caracas y Miranda. Asegúrate de publicar 1 en la mañana (Caracas) y 1 en la tarde (Guarenas/Guatire)."}
                </p>
              </div>

              {/* MercadoLibre Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase">MercadoLibre (Meta: 2/día)</h3>
                    <span className="text-[11px] text-slate-500">
                      Registradas esta semana: <strong>{metaAudit.mlWeekly}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {metaAudit.isMlStrong
                    ? "⭐ Muy buen ritmo. MercadoLibre indexa en 4 a 6 horas. Publicar 2 al día genera volumen en el buscador para palabras clave como 'al mayor', 'bulto', 'descartables' y 'delivery'."
                    : "📌 MercadoLibre premia la reactivación constante. Si no publicas nuevo stock, edita o reactiva publicaciones de productos estrella para que el algoritmo las vuelva a recomendar arriba."}
                </p>
              </div>
            </div>

            {/* Guía Maestra de Horarios Pico en Venezuela (Zona Caracas UTC-4) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                Mapa de Horarios Pico Comerciales en Venezuela (UTC-4)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                    <span>☀️ Mañana: 08:00 AM – 10:00 AM</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Pico Alto</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    <strong>Público:</strong> Comerciantes, panaderías, cafeterías y reposteras abriendo negocio y revisando qué stock les falta para el día.
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                    👉 Mejor contenido: Producto estrella del día + Precios en $ y Bs tasa BCV + Zonas de entrega de la mañana.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                    <span>🍲 Mediodía: 12:30 PM – 02:00 PM</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Pico Reels</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    <strong>Público:</strong> Hora de almuerzo y descanso. Los usuarios navegan Instagram Reels y Marketplace con mayor atención visual.
                  </p>
                  <p className="text-[11px] text-blue-700 font-semibold mt-2">
                    👉 Mejor contenido: Reel de demostración, resistencia de vasos/cajas, unboxing de bultos recién llegados.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                    <span>🌙 Noche: 06:30 PM – 08:30 PM</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Pico de Cierres</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    <strong>Público:</strong> Dueños de negocios haciendo arqueo de caja y coordinando pedidos para recibir a primera hora al día siguiente.
                  </p>
                  <p className="text-[11px] text-purple-700 font-semibold mt-2">
                    👉 Mejor contenido: "Agenda tu pedido de mañana", métodos de pago (Pago Móvil, Zelle, efectivo) y WhatsApp directo.
                  </p>
                </div>
              </div>
            </div>

            {/* 5 Recomendaciones Tácticas de Especialista Meta */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                5 Recomendaciones Tácticas para Maximizar Ventas con esta Grilla
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Usa el Sticker de Enlace directo a WhatsApp o a tu Web</h4>
                    <p className="text-slate-500 mt-0.5">
                      En cada una de las 6 historias de Instagram, no dependas solo de que te escriban al DM. Coloca un sticker visible con texto: <em>"📲 Pedir por WhatsApp"</em> o <em>"🌐 Ver en Catálogo"</em>. Reduce en 40% la pérdida de prospectos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Rotación de Catálogo (Evita publicar siempre lo mismo)</h4>
                    <p className="text-slate-500 mt-0.5">
                      Revisa tu resumen mensual: si notas que publicaste 20 veces las Bolsas Kraft y solo 1 vez las Cajas o Moldes Navideños, estás dejando dinero sobre la mesa. Alterna 1 producto de alta rotación con 1 producto estacional o de mayor margen cada día.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">En Marketplace FB: Fotos reales en vez de fondos blancos</h4>
                    <p className="text-slate-500 mt-0.5">
                      El algoritmo de Marketplace prioriza fotos tomadas con el teléfono donde se vea el bulto en el almacén o local. Las fotos de estudio o con fondo blanco puro reciben menos clics orgánicos porque los usuarios creen que es publicidad o catálogo externo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Palabras Clave en Títulos de MercadoLibre</h4>
                    <p className="text-slate-500 mt-0.5">
                      Usa siempre la fórmula: <em>[Nombre Producto] [Medida/Capacidad] [Al Mayor / Por Bulto] [Sumilisto]</em>. Los compradores corporativos buscan específicamente "por bulto" o "al mayor" para filtrar minoristas caros.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Claridad en Precios y Tasa BCV</h4>
                    <p className="text-slate-500 mt-0.5">
                      En Venezuela la transparencia en precios es el mayor generador de confianza. Especifica siempre el precio en $ y la referencia a Tasa Oficial BCV. Los compradores de negocios no quieren preguntar "¿precio al DM?", quieren saber si el número les da para su costo operativo.
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
