"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import { formatUsd } from "@/lib/currency/format";
import {
  Clock, CheckCircle2, MessageCircle, AlertCircle, Phone, MapPin,
  Package, ChevronDown, ChevronUp, RefreshCw, ShoppingBag, ArrowLeft,
  DollarSign, Check, Lock, User, LogOut, ExternalLink
} from "lucide-react";

interface AbandonedCart {
  id?: string;
  session_id: string;
  nombre?: string;
  telefono?: string;
  zona_entrega?: string;
  direccion?: string;
  metodo_pago?: string;
  items?: any[];
  total_usd?: number;
  estado?: string;
  created_at?: string;
  updated_at?: string;
  contactado_at?: string;
}

export default function AdminCarritosPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [carritos, setCarritos] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"listos" | "recientes" | "contactados" | "todos">("listos");
  const [expandedCartId, setExpandedCartId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) loadCarritos();
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
        loadCarritos();
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

  const loadCarritos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart/abandoned");
      const data = await res.json();
      setCarritos(data.carritos || []);
    } catch (err) {
      console.error("Error cargando carritos:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsContacted = async (sessionId: string) => {
    setUpdatingId(sessionId);
    try {
      await fetch("/api/cart/abandoned", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, estado: "contactado" }),
      });
      setCarritos((prev) =>
        prev.map((c) =>
          c.session_id === sessionId ? { ...c, estado: "contactado", contactado_at: new Date().toISOString() } : c
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Clasificación de carritos según la regla de 24h y 48h
  const categorized = useMemo(() => {
    const now = Date.now();
    const listos: AbandonedCart[] = [];
    const recientes: AbandonedCart[] = [];
    const contactados: AbandonedCart[] = [];
    const todos: AbandonedCart[] = [];

    carritos.forEach((c) => {
      todos.push(c);
      if (c.estado === "contactado" || c.estado === "completado") {
        contactados.push(c);
        return;
      }

      const cartTime = new Date(c.updated_at || c.created_at || now).getTime();
      const elapsedHours = (now - cartTime) / (1000 * 60 * 60);

      // Regla: Lista para seguimiento entre 24 y 48 horas
      if (elapsedHours >= 24 && elapsedHours <= 48) {
        listos.push(c);
      } else if (elapsedHours < 24) {
        recientes.push(c);
      }
    });

    return { listos, recientes, contactados, todos };
  }, [carritos]);

  // Mensaje de WhatsApp personalizado para recuperación
  const getWhatsAppRecoveryUrl = (cart: AbandonedCart) => {
    let cleanPhone = (cart.telefono || "").replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "58" + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith("58")) {
      cleanPhone = "58" + cleanPhone;
    }

    const cliente = cart.nombre ? cart.nombre.trim() : "amigo/a";
    const zona = cart.zona_entrega ? ` para ${cart.zona_entrega}` : "";
    const total = cart.total_usd ? ` por $${cart.total_usd}` : "";

    const text = `¡Hola ${cliente}! 👋 Te saludamos de *Sumilisto* 📦\n\n` +
      `Vimos que hace un día estuviste preparando un pedido de suministros${zona}${total} en nuestra tienda web.\n\n` +
      `¿Tuviste alguna duda con las medidas de los envases, las cantidades o los despachos a tu zona? Con gusto te apoyamos para coordinarlo y despacharte hoy mismo 🙌`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const getElapsedTimeText = (dateString?: string) => {
    if (!dateString) return "Fecha desconocida";
    const diffHours = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Hace menos de 1 hora";
    if (diffHours === 1) return "Hace 1 hora";
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    const days = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    return `Hace ${days} día${days > 1 ? "s" : ""} y ${remHours}h`;
  };

  const currentList = categorized[selectedTab];
  const potentialRevenue = categorized.listos.reduce((acc, c) => acc + (Number(c.total_usd) || 0), 0);

  if (!authChecked) {
    return <div className="max-w-md mx-auto px-4 py-24 text-center text-sm text-slate-400">Verificando acceso...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col gap-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-50 text-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-emerald-800" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Administrador</h1>
            <p className="text-xs text-slate-500 mt-1">Ingresa tus credenciales para ver los carritos abandonados.</p>
          </div>
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Usuario" value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" placeholder="••••••••" value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
            </div>
            {authError && <p className="text-xs text-rose-500 font-semibold">{authError}</p>}
          </div>
          <button type="submit" disabled={loggingIn}
            className="w-full h-11 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover disabled:opacity-60">
            {loggingIn ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Barra superior con navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/settings" className="text-xs font-bold text-slate-500 hover:text-brand flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Ajustes
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-brand" />
            Carritos Abandonados y Seguimiento
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Monitorea los clientes que iniciaron su pedido pero no enviaron el WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadCarritos}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refrescar</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Listos para Seguir</span>
            <AlertCircle className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-3xl font-black">{categorized.listos.length}</div>
          <p className="text-xs text-emerald-100 mt-1">Pasadas 24 horas (Ventana activa)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recientes (&lt; 24h)</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{categorized.recientes.length}</div>
          <p className="text-xs text-slate-400 mt-1">En período de compra normal</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contactados / Éxito</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{categorized.contactados.length}</div>
          <p className="text-xs text-slate-400 mt-1">Pedidos gestionados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monto en Riesgo (24h)</span>
            <DollarSign className="w-5 h-5 text-brand" />
          </div>
          <div className="text-3xl font-black text-slate-900">{formatUsd(potentialRevenue)}</div>
          <p className="text-xs text-slate-400 mt-1">Recuperable en carritos listos</p>
        </div>
      </div>

      {/* Regla explicativa */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Regla de Seguimiento Configurada:</strong> Los clientes se consideran listos para contactar tras haber cumplido <strong>24 horas</strong> desde que armaron su carrito. Tienes una ventana de <strong>24 horas adicionales</strong> (hasta las 48h) para escribirles por WhatsApp y coordinar su despacho antes de que el borrador expire.
        </div>
      </div>

      {/* Pestañas de Filtro */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setSelectedTab("listos")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            selectedTab === "listos"
              ? "bg-brand text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>🎯 Listos para Contactar (24h - 48h)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${selectedTab === "listos" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
            {categorized.listos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab("recientes")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            selectedTab === "recientes"
              ? "bg-brand text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>⏳ Recientes (&lt; 24h)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600">
            {categorized.recientes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab("contactados")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            selectedTab === "contactados"
              ? "bg-brand text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>✅ Contactados</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600">
            {categorized.contactados.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab("todos")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            selectedTab === "todos"
              ? "bg-brand text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>📁 Todos</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600">
            {categorized.todos.length}
          </span>
        </button>
      </div>

      {/* Lista de Carritos */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-800">No hay carritos en esta sección</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {selectedTab === "listos"
              ? "¡Excelente! No hay carritos que hayan cumplido las 24 horas pendientes de seguimiento en este momento."
              : "A medida que los visitantes agreguen su número en el checkout, aparecerán aquí registrados automáticamente."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((cart) => {
            const isExpanded = expandedCartId === cart.session_id;
            const isReadyForContact = selectedTab === "listos" || (
              cart.estado !== "contactado" &&
              cart.estado !== "completado" &&
              (Date.now() - new Date(cart.updated_at || cart.created_at || Date.now()).getTime()) >= 24 * 3600 * 1000
            );

            return (
              <div
                key={cart.session_id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-sm ${
                  isReadyForContact ? "border-emerald-300 ring-1 ring-emerald-500/20" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Datos del Cliente */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {cart.nombre || "Cliente sin nombre"}
                      </h3>
                      {isReadyForContact && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                          🎯 Listo para contactar
                        </span>
                      )}
                      {cart.estado === "contactado" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          ✅ Contactado
                        </span>
                      )}
                      {cart.estado === "completado" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                          🎉 Pedido Enviado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                      {cart.telefono && (
                        <a
                          href={`tel:${cart.telefono}`}
                          className="font-bold text-slate-800 hover:text-brand flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cart.telefono}</span>
                        </a>
                      )}
                      {cart.zona_entrega && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cart.zona_entrega}</span>
                        </span>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 font-medium">
                        {getElapsedTimeText(cart.updated_at || cart.created_at)}
                      </span>
                    </div>

                    {cart.direccion && (
                      <p className="text-xs text-slate-500 italic mt-0.5">
                        📍 {cart.direccion}
                      </p>
                    )}
                  </div>

                  {/* Monto y Botones de Acción */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right pr-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Carrito</span>
                      <span className="text-xl font-black text-slate-900">{formatUsd(cart.total_usd || 0)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {cart.telefono && (
                        <a
                          href={getWhatsAppRecoveryUrl(cart)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Escribir WhatsApp</span>
                        </a>
                      )}

                      {cart.estado !== "contactado" && (
                        <button
                          type="button"
                          onClick={() => markAsContacted(cart.session_id)}
                          disabled={updatingId === cart.session_id}
                          className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Marcar Contactado</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedCartId(isExpanded ? null : cart.session_id)}
                        className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                        aria-label="Ver productos"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Desplegable con lista de productos */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-xl p-4 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Productos en el carrito ({(cart.items || []).length})
                    </span>
                    {(cart.items || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No hay detalle de productos guardado.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {cart.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-200/60 last:border-0">
                            <div>
                              <span className="font-bold text-slate-900">{item.nombre}</span>
                              {item.presentacion && <span className="text-slate-500 ml-1">({item.presentacion})</span>}
                              <span className="text-slate-500 ml-2">× {item.cantidad} unds</span>
                            </div>
                            <span className="font-bold text-slate-900">{formatUsd(item.subtotal || 0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
