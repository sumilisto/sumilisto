"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { GrillaItem, GrillaCanal, GrillaDia } from "@/types/grilla";
import { getDefaultGrillaItems } from "@/lib/grilla/defaults";
import { Product } from "@/types/product";
import { formatUsd } from "@/lib/currency/format";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Copy,
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
  ArrowRight,
  FileText,
  Share2,
  CheckSquare,
  Flame,
  Save,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/common/WhatsAppIcon";

export default function AdminGrillaPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");

  // Grilla state
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [items, setItems] = useState<GrillaItem[]>([]);
  const [notasGenerales, setNotasGenerales] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filter & products state
  const [selectedCanal, setSelectedCanal] = useState<"todos" | GrillaCanal | "pendientes">("todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [globalStats, setGlobalStats] = useState<{ totalCompletadasGlobal: number; diasConActividad: number }>({
    totalCompletadasGlobal: 0,
    diasConActividad: 0,
  });

  // 1. Verificar autenticación
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

  // 2. Cargar productos del catálogo para poder vincular
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data || []);
      }
    } catch (e) {
      console.warn("No se pudieron cargar los productos:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 3. Cargar grilla para la fecha seleccionada
  const loadGrilla = async (fecha: string) => {
    try {
      setLoading(true);
      setHasUnsavedChanges(false);
      const res = await fetch(`/api/grilla?fecha=${fecha}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || getDefaultGrillaItems(fecha));
        setNotasGenerales(data.notasGenerales || "");
        if (data.stats) {
          setGlobalStats(data.stats);
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
      if (!confirm("Tienes cambios sin guardar. ¿Deseas cambiar de fecha de todas formas?")) {
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

  // 4. Guardar cambios en el servidor
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
        setSaveSuccessMsg("¡Grilla guardada con éxito!");
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

  // 5. Manejar login
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
        const nextCompleted = !item.completada;
        return {
          ...item,
          completada: nextCompleted,
          completadaAt: nextCompleted ? new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }) : undefined,
        };
      }
      return item;
    });
    setItems(updated);
    setHasUnsavedChanges(true);
    // Guardado automático ligero
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
      return;
    }

    const firstPhoto = prod.fotos?.[0]?.url || "";
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        // Auto-inyectar datos del producto en el copy si tiene marcadores o añadir resumen
        let newCopy = item.copia;
        const mayorPriceText = prod.precioMayorUsd ? `${formatUsd(prod.precioMayorUsd)} (desde ${prod.minMayor} unds)` : "";
        const granMayorPriceText = prod.precioGranMayorUsd ? `${formatUsd(prod.precioGranMayorUsd)} (desde ${prod.minGranMayor} unds)` : "";

        if (newCopy.includes("[Nombre del Producto]") || newCopy.includes("[Producto]")) {
          newCopy = newCopy.replace(/\[Nombre del Producto\]|\[Producto\]/g, prod.nombre);
        }

        return {
          ...item,
          productoId: prod.id,
          productoNombre: prod.nombre,
          productoImagen: firstPhoto,
          titulo: `${item.tipo.split(":")[0]}: ${prod.nombre}`,
          copia: newCopy,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const injectProductPricesToCopy = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.productoId) return;
    const prod = products.find((p) => p.id === item.productoId);
    if (!prod) return;

    const mayor = prod.precioMayorUsd ? `${formatUsd(prod.precioMayorUsd)} (desde ${prod.minMayor || 50} unds)` : "Consultar";
    const granMayor = prod.precioGranMayorUsd ? `${formatUsd(prod.precioGranMayorUsd)} (desde ${prod.minGranMayor || 150} unds)` : "Consultar";

    const snippet = `\n\n📌 Precios oficiales Sumilisto:\n• Mayor: ${mayor}\n• Gran Mayor: ${granMayor}\n📍 Despachos en Caracas, Guarenas y Guatire.`;
    updateItemField(itemId, "copia", item.copia + snippet);
  };

  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      alert("No se pudo copiar el texto al portapapeles.");
    }
  };

  const handleResetToDefaults = () => {
    if (confirm("¿Estás seguro de restablecer los 10 slots sugeridos para este día? Se perderán las modificaciones no guardadas.")) {
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
      horarioSugerido: "Por definir",
      titulo: `Nueva publicación en ${canal}`,
      copia: `Escribe aquí el texto o guión para esta publicación...`,
      completada: false,
    };
    setItems((prev) => [...prev, newItem]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm("¿Eliminar este slot de publicación?")) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setHasUnsavedChanges(true);
    }
  };

  // 7. Cálculos y métricas del día
  const totalItems = items.length;
  const completadas = items.filter((i) => i.completada).length;
  const percent = totalItems > 0 ? Math.round((completadas / totalItems) * 100) : 0;

  const igItems = items.filter((i) => i.canal === "instagram");
  const igDone = igItems.filter((i) => i.completada).length;

  const mlItems = items.filter((i) => i.canal === "mercadolibre");
  const mlDone = mlItems.filter((i) => i.completada).length;

  const fbItems = items.filter((i) => i.canal === "facebook");
  const fbDone = fbItems.filter((i) => i.completada).length;

  // Filtrado de items a mostrar
  const filteredItems = useMemo(() => {
    if (selectedCanal === "todos") return items;
    if (selectedCanal === "pendientes") return items.filter((i) => !i.completada);
    return items.filter((i) => i.canal === selectedCanal);
  }, [items, selectedCanal]);

  // Formato legible de fecha
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

  // Pantalla de carga inicial de autenticación
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Verificando sesión de administrador...</p>
        </div>
      </div>
    );
  }

  // Pantalla de Login si no está autenticado
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
            Planificador diario: Instagram (6), MercadoLibre (2), Facebook (2)
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
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-900/10 transition-all flex items-center justify-center gap-2"
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

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Cabecera Principal y Selector de Fecha */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Grilla Diaria de Publicaciones
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      10 Diarias
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 capitalize">
                    {formattedDateTitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Controles de Navegación de Fecha y Guardado */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Botón Día Anterior */}
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Ayer</span>
              </button>

              {/* Botón Hoy */}
              <button
                onClick={() => handleDateChange(todayStr)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedDate === todayStr
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Hoy
              </button>

              {/* Botón Día Siguiente */}
              <button
                onClick={() => shiftDate(1)}
                className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Día siguiente"
              >
                <span className="hidden sm:inline">Mañana</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Selector de Fecha */}
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Botón Guardar Cambios */}
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
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
                    <span>{hasUnsavedChanges ? "Guardar Cambios *" : "Guardar Grilla"}</span>
                  </>
                )}
              </button>

              {/* Botón Plantillas de Copy */}
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Plantillas de Copys</span>
              </button>
            </div>
          </div>

          {/* Notificación de guardado */}
          {saveSuccessMsg && (
            <div className="mt-3 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Barra de Progreso Diario */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Progreso Diario: {completadas} de {totalItems} completadas
              </span>
              <span className={`font-black ${percent === 100 ? "text-emerald-600" : "text-slate-600"}`}>
                {percent}% Cumplido {percent === 100 && "🎉 ¡Meta cumplida!"}
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percent === 100
                    ? "bg-emerald-500 shadow-sm"
                    : percent >= 50
                    ? "bg-emerald-600"
                    : "bg-amber-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tarjetas de Metas por Canal (Instagram 6, ML 2, FB 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Instagram Card (Meta: 6) */}
          <div
            onClick={() => setSelectedCanal(selectedCanal === "instagram" ? "todos" : "instagram")}
            className={`cursor-pointer rounded-2xl p-4 border transition-all ${
              selectedCanal === "instagram"
                ? "ring-2 ring-pink-500 border-pink-400 bg-pink-50/40 shadow-sm"
                : "bg-white border-slate-200/80 hover:border-pink-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 leading-tight">Instagram</h2>
                  <span className="text-[11px] text-slate-500 font-medium">Meta: 6 publicaciones</span>
                </div>
              </div>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  igDone >= 6
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-pink-100 text-pink-800 border border-pink-200"
                }`}
              >
                {igDone} / 6
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Historias, Reels y Feed</span>
              <span className="font-semibold text-pink-600 hover:underline">
                {selectedCanal === "instagram" ? "Ver todos" : "Filtrar"}
              </span>
            </div>
          </div>

          {/* MercadoLibre Card (Meta: 2) */}
          <div
            onClick={() => setSelectedCanal(selectedCanal === "mercadolibre" ? "todos" : "mercadolibre")}
            className={`cursor-pointer rounded-2xl p-4 border transition-all ${
              selectedCanal === "mercadolibre"
                ? "ring-2 ring-amber-400 border-amber-300 bg-amber-50/40 shadow-sm"
                : "bg-white border-slate-200/80 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFE600] text-blue-950 flex items-center justify-center font-black shadow-sm border border-amber-300">
                  <ShoppingBag className="w-4 h-4 text-blue-950" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 leading-tight">MercadoLibre</h2>
                  <span className="text-[11px] text-slate-500 font-medium">Meta: 2 publicaciones</span>
                </div>
              </div>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  mlDone >= 2
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-900 border border-amber-200"
                }`}
              >
                {mlDone} / 2
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Producto Estrella y Combos</span>
              <span className="font-semibold text-amber-700 hover:underline">
                {selectedCanal === "mercadolibre" ? "Ver todos" : "Filtrar"}
              </span>
            </div>
          </div>

          {/* Facebook Marketplace Card (Meta: 2) */}
          <div
            onClick={() => setSelectedCanal(selectedCanal === "facebook" ? "todos" : "facebook")}
            className={`cursor-pointer rounded-2xl p-4 border transition-all ${
              selectedCanal === "facebook"
                ? "ring-2 ring-blue-500 border-blue-400 bg-blue-50/40 shadow-sm"
                : "bg-white border-slate-200/80 hover:border-blue-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-sm">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 leading-tight">FB Marketplace</h2>
                  <span className="text-[11px] text-slate-500 font-medium">Meta: 2 publicaciones</span>
                </div>
              </div>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  fbDone >= 2
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }`}
              >
                {fbDone} / 2
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Caracas y Guarenas-Guatire</span>
              <span className="font-semibold text-blue-600 hover:underline">
                {selectedCanal === "facebook" ? "Ver todos" : "Filtrar"}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Herramientas */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <button
              onClick={() => setSelectedCanal("todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedCanal === "todos"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Todos ({totalItems})
            </button>
            <button
              onClick={() => setSelectedCanal("instagram")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedCanal === "instagram"
                  ? "bg-pink-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Instagram ({igDone}/6)
            </button>
            <button
              onClick={() => setSelectedCanal("mercadolibre")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedCanal === "mercadolibre"
                  ? "bg-amber-500 text-slate-950 font-black"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              MercadoLibre ({mlDone}/2)
            </button>
            <button
              onClick={() => setSelectedCanal("facebook")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedCanal === "facebook"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              FB Marketplace ({fbDone}/2)
            </button>
            <button
              onClick={() => setSelectedCanal("pendientes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedCanal === "pendientes"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Pendientes ({totalItems - completadas})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefaults}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 hover:underline"
              title="Restablecer a las 10 tareas recomendadas"
            >
              <RefreshCw className="w-3 h-3" />
              Restablecer plantilla
            </button>
          </div>
        </div>

        {/* Lista de Slots de Publicación */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-medium">Cargando publicaciones para {selectedDate}...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base mb-1">¡No hay tareas pendientes en este filtro!</h3>
            <p className="text-slate-500 text-xs">
              Has completado todas las publicaciones de esta categoría o no hay tareas configuradas.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item, index) => {
              const isIg = item.canal === "instagram";
              const isMl = item.canal === "mercadolibre";
              const isFb = item.canal === "facebook";

              const badgeColor = isIg
                ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white"
                : isMl
                ? "bg-[#FFE600] text-blue-950 font-black border border-amber-300"
                : "bg-[#1877F2] text-white";

              const platformLabel = isIg
                ? "Instagram"
                : isMl
                ? "MercadoLibre"
                : "FB Marketplace";

              const platformUrl = isIg
                ? "https://www.instagram.com/sumilisto_/"
                : isMl
                ? "https://www.mercadolibre.com.ve"
                : "https://www.facebook.com/marketplace";

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                    item.completada
                      ? "border-emerald-200 bg-emerald-50/20"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {/* Encabezado del Slot */}
                  <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      {/* Checkbox de Completado */}
                      <button
                        onClick={() => toggleItemCompleted(item.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          item.completada
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-white border-2 border-slate-300 hover:border-emerald-500 text-transparent"
                        }`}
                        title={item.completada ? "Marcar como pendiente" : "Marcar como completada"}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      {/* Badge de Canal */}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs ${badgeColor}`}>
                        {platformLabel} #{item.slotNumber}
                      </span>

                      {/* Horario Sugerido */}
                      <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={item.horarioSugerido}
                          onChange={(e) => updateItemField(item.id, "horarioSugerido", e.target.value)}
                          className="bg-transparent border-b border-dotted border-slate-300 hover:border-slate-500 text-slate-700 text-xs w-20 px-1 py-0.5 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.completada && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Publicado {item.completadaAt && `(${item.completadaAt})`}
                        </span>
                      )}

                      {/* Abrir plataforma */}
                      <a
                        href={platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title={`Abrir ${platformLabel}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {/* Eliminar slot opcional */}
                      <button
                        onClick={() => handleDeleteSlot(item.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar este slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo del Slot */}
                  <div className="p-4 sm:p-5">
                    {/* Título / Tipo de contenido */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={item.titulo}
                        onChange={(e) => updateItemField(item.id, "titulo", e.target.value)}
                        placeholder="Título o tipo de publicación..."
                        className="w-full font-bold text-slate-900 text-sm sm:text-base bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none px-1 py-0.5 rounded transition-colors"
                      />
                    </div>

                    {/* Selector de Producto Asociado del Catálogo */}
                    <div className="mb-4 bg-slate-50 rounded-xl p-3 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.productoImagen ? (
                          <img
                            src={item.productoImagen}
                            alt="Producto"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Producto del Catálogo Asociado
                          </span>
                          <select
                            value={item.productoId || ""}
                            onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">-- Sin vincular (Seleccionar producto) --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} ({p.categoria}) — Mayor: {p.precioMayorUsd ? `$${p.precioMayorUsd}` : "-"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {item.productoId && (
                        <button
                          type="button"
                          onClick={() => injectProductPricesToCopy(item.id)}
                          className="shrink-0 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors self-start sm:self-auto"
                          title="Añadir precios oficiales al texto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Inyectar Precios en Copy
                        </button>
                      )}
                    </div>

                    {/* Área de Copy / Texto de Publicación */}
                    <div className="relative">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span className="font-bold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          Texto / Copy para publicar:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {item.copia?.length || 0} caracteres
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.id, item.copia)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              copiedId === item.id
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Texto</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={5}
                        value={item.copia}
                        onChange={(e) => updateItemField(item.id, "copia", e.target.value)}
                        placeholder="Escribe el copy, hashtags o instrucciones para esta publicación..."
                        className="w-full font-mono text-xs text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botones para añadir publicaciones adicionales */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handleAddNewSlot("instagram")}
            className="px-3.5 py-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + Publicación Instagram Extra
          </button>
          <button
            onClick={() => handleAddNewSlot("mercadolibre")}
            className="px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + Publicación MercadoLibre Extra
          </button>
          <button
            onClick={() => handleAddNewSlot("facebook")}
            className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + Publicación Marketplace Extra
          </button>
        </div>

        {/* Sección de Notas Generales y Estrategia del Día */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Notas Generales / Estrategia del Día
          </h2>
          <textarea
            rows={3}
            value={notasGenerales}
            onChange={(e) => {
              setNotasGenerales(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="Apunta ideas, recordatorios de despachos, inventarios bajos o promociones especiales para el día..."
            className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Notas y Grilla</span>
            </button>
          </div>
        </div>
      </main>

      {/* Modal de Plantillas de Copys Rápidos */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-slate-900 text-base">Plantillas y Fórmulas de Copys</h3>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>🔥 Fórmula Escala de Descuento (Instagram)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `💡 ¿Compras al Mayor o al Gran Mayor?\n\nEn Sumilisto te premiamos por volumen de compra:\n📦 Mayor (a partir de 50 unds): Perfecto para no descapitalizar tu stock.\n🔥 Gran Mayor (a partir de 150/200 unds): Máximo margen de ganancia para tu negocio.\n\n🛵 Entregas en Caracas, Guarenas y Guatire.\n📲 Catálogo con precios en el link de la bio.`
                      );
                      alert("¡Plantilla copiada!");
                    }}
                    className="text-emerald-700 hover:underline font-bold"
                  >
                    Copiar
                  </button>
                </h4>
                <p className="text-slate-600 whitespace-pre-line font-mono text-[11px]">
                  {`💡 ¿Compras al Mayor o al Gran Mayor?\n\nEn Sumilisto te premiamos por volumen de compra:\n📦 Mayor (a partir de 50 unds): Perfecto para no descapitalizar tu stock.\n🔥 Gran Mayor (a partir de 150/200 unds): Máximo margen de ganancia para tu negocio.\n\n🛵 Entregas en Caracas, Guarenas y Guatire.\n📲 Catálogo con precios en el link de la bio.`}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>💛 Ficha Rápida MercadoLibre</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `DESCRIPCIÓN DEL PRODUCTO:\nDistribuidor oficial Sumilisto en Venezuela.\n\n• Material de alta resistencia apto para contacto con alimentos\n• Precios al Mayor y Gran Mayor por bulto cerrado\n• Facturación y despacho inmediato\n• Entregas personales en Caracas, Guarenas y Guatire\n• Envíos gratis por MRW y Zoom a todo el país vía Mercado Envíos\n\nHORARIO DE ATENCIÓN:\nLunes a Sábado de 8:00 AM a 5:00 PM.`
                      );
                      alert("¡Plantilla copiada!");
                    }}
                    className="text-emerald-700 hover:underline font-bold"
                  >
                    Copiar
                  </button>
                </h4>
                <p className="text-slate-600 whitespace-pre-line font-mono text-[11px]">
                  {`DESCRIPCIÓN DEL PRODUCTO:\nDistribuidor oficial Sumilisto en Venezuela.\n\n• Material de alta resistencia apto para contacto con alimentos\n• Precios al Mayor y Gran Mayor por bulto cerrado\n• Facturación y despacho inmediato\n• Entregas personales en Caracas, Guarenas y Guatire\n• Envíos gratis por MRW y Zoom a todo el país vía Mercado Envíos\n\nHORARIO DE ATENCIÓN:\nLunes a Sábado de 8:00 AM a 5:00 PM.`}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>💙 Formato Ganador Marketplace Facebook</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `¿Tienes local o emprendimiento de comida, repostería o delivery en Caracas?\n\nTenemos los empaques que necesitas al mejor precio al Mayor y Gran Mayor.\n\n✔️ Cero empaques rotos\n✔️ Tapa hermética y máxima presentación\n✔️ Tasa oficial BCV\n✔️ Despacho directo a tu negocio\n\nEscríbenos al WhatsApp 0422-786-4547 para catálogo inmediato con fotos y medidas.`
                      );
                      alert("¡Plantilla copiada!");
                    }}
                    className="text-emerald-700 hover:underline font-bold"
                  >
                    Copiar
                  </button>
                </h4>
                <p className="text-slate-600 whitespace-pre-line font-mono text-[11px]">
                  {`¿Tienes local o emprendimiento de comida, repostería o delivery en Caracas?\n\nTenemos los empaques que necesitas al mejor precio al Mayor y Gran Mayor.\n\n✔️ Cero empaques rotos\n✔️ Tapa hermética y máxima presentación\n✔️ Tasa oficial BCV\n✔️ Despacho directo a tu negocio\n\nEscríbenos al WhatsApp 0422-786-4547 para catálogo inmediato con fotos y medidas.`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
