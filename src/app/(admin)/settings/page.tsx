"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme/ThemeContext";
import { DEFAULT_SETTINGS, HeroSlide } from "@/lib/constants/settings";
import { loginAdmin, logoutAdmin, isAdminAuthenticated } from "@/lib/actions/auth";
import {
  Save, RefreshCcw, Image as ImageIcon, Palette, Phone, Lock,
  User, LogOut, CheckCircle2, Type, Layout, Truck, Plus, X, Link as LinkIcon,
  Coins, ExternalLink, TrendingUp, AlertTriangle, Package,
} from "lucide-react";



const HEIGHT_OPTIONS = [
  { value: "sm", label: "Compacto / Delgado (Recomendado)" },
  { value: "md", label: "Mediano" },
  { value: "lg", label: "Amplio" },
];

export default function AdminSettingsPage() {
  const { theme, updateTheme, resetTheme } = useTheme();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [saved, setSaved] = useState(false);

  // Local state mirrors
  const [colors, setColors] = useState<Record<string, string>>({});
  const [logoUrl, setLogoUrl] = useState(theme.logoUrl || "");
  const [whatsappNumber, setWhatsappNumber] = useState(theme.whatsappNumber || "");
  const [heroTitle, setHeroTitle] = useState(theme.heroTitle || "");
  const [heroSubtitle, setHeroSubtitle] = useState(theme.heroSubtitle || "");
  const [heroHeight, setHeroHeight] = useState<"sm"|"md"|"lg"|"xl">(theme.heroHeight || "md");
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(theme.heroSlides || []);
  const [despachoText, setDespachoText] = useState(theme.despachoText || "");

  // Footer settings state
  const [footerDescription, setFooterDescription] = useState(theme.footerDescription || DEFAULT_SETTINGS.footerDescription);
  const [footerSchedule, setFooterSchedule] = useState(theme.footerSchedule || DEFAULT_SETTINGS.footerSchedule);
  const [footerDeliveryText, setFooterDeliveryText] = useState(theme.footerDeliveryText || DEFAULT_SETTINGS.footerDeliveryText);
  const [footerBgColor, setFooterBgColor] = useState(theme.footerBgColor || DEFAULT_SETTINGS.footerBgColor);
  const [footerTextColor, setFooterTextColor] = useState(theme.footerTextColor || DEFAULT_SETTINGS.footerTextColor);

  // Barra Inferior Móvil settings state
  const [bottomNavBgColor, setBottomNavBgColor] = useState(theme.bottomNavBgColor || DEFAULT_SETTINGS.bottomNavBgColor);
  const [bottomNavTextColor, setBottomNavTextColor] = useState(theme.bottomNavTextColor || DEFAULT_SETTINGS.bottomNavTextColor);
  const [bottomNavActiveColor, setBottomNavActiveColor] = useState(theme.bottomNavActiveColor || DEFAULT_SETTINGS.bottomNavActiveColor);
  const [navLabelInicio, setNavLabelInicio] = useState(theme.navLabelInicio || DEFAULT_SETTINGS.navLabelInicio);
  const [navLabelCategorias, setNavLabelCategorias] = useState(theme.navLabelCategorias || DEFAULT_SETTINGS.navLabelCategorias);
  const [navLabelCarrito, setNavLabelCarrito] = useState(theme.navLabelCarrito || DEFAULT_SETTINGS.navLabelCarrito);
  const [navLabelBuscar, setNavLabelBuscar] = useState(theme.navLabelBuscar || DEFAULT_SETTINGS.navLabelBuscar);
  const [navLabelDespachos, setNavLabelDespachos] = useState(theme.navLabelDespachos || DEFAULT_SETTINGS.navLabelDespachos);

  // Tipografía y Márgenes de Tarjetas de Producto
  const [cardCategoryFontSize, setCardCategoryFontSize] = useState(theme.cardCategoryFontSize || DEFAULT_SETTINGS.cardCategoryFontSize || "11px");
  const [cardTitleFontSize, setCardTitleFontSize] = useState(theme.cardTitleFontSize || DEFAULT_SETTINGS.cardTitleFontSize || "13px");
  const [cardMayorFontSize, setCardMayorFontSize] = useState(theme.cardMayorFontSize || DEFAULT_SETTINGS.cardMayorFontSize || "15px");
  const [cardGranMayorFontSize, setCardGranMayorFontSize] = useState(theme.cardGranMayorFontSize || DEFAULT_SETTINGS.cardGranMayorFontSize || "14px");
  const [cardPaddingY, setCardPaddingY] = useState(theme.cardPaddingY || DEFAULT_SETTINGS.cardPaddingY || "4px");
  const [cardPaddingX, setCardPaddingX] = useState(theme.cardPaddingX || DEFAULT_SETTINGS.cardPaddingX || "10px");
  const [cardLineSpacing, setCardLineSpacing] = useState(theme.cardLineSpacing || DEFAULT_SETTINGS.cardLineSpacing || "3px");

  // Estado para Tasa BCV (Exclusivamente de https://www.bcv.org.ve/)
  const [bcvRate, setBcvRate] = useState<number>(880.12);
  const [bcvManualInput, setBcvManualInput] = useState<string>("880.12");
  const [bcvFechaValor, setBcvFechaValor] = useState<string | null>(null);
  const [isOfficialOnline, setIsOfficialOnline] = useState<boolean>(true);
  const [syncingBcv, setSyncingBcv] = useState(false);
  const [bcvStatusMsg, setBcvStatusMsg] = useState("");
  const [bcvErrorMsg, setBcvErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/bcv")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.rate) {
          setBcvRate(data.rate);
          setBcvManualInput(String(data.rate));
          if (data.fechaValor) setBcvFechaValor(data.fechaValor);
          setIsOfficialOnline(data.isOfficialOnline ?? true);
          if (data.notice && !data.isOfficialOnline) {
            setBcvErrorMsg(data.notice);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSyncBcv = async () => {
    setSyncingBcv(true);
    setBcvStatusMsg("");
    setBcvErrorMsg("");
    try {
      const res = await fetch("/api/bcv?refresh=true");
      const data = await res.json();
      if (data.ok && data.rate) {
        setBcvRate(data.rate);
        setBcvManualInput(String(data.rate));
        if (data.fechaValor) setBcvFechaValor(data.fechaValor);
        setIsOfficialOnline(data.isOfficialOnline ?? true);

        if (data.isOfficialOnline) {
          setBcvStatusMsg(`¡Sincronizado exitosamente desde bcv.org.ve! Tasa oficial: Bs. ${data.rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} (${data.fechaValor || 'Hoy'})`);
        } else {
          setBcvErrorMsg(data.notice || "⚠️ La página oficial https://www.bcv.org.ve/ está caída o inaccesible. Se mantiene la última actualización guardada.");
        }
      } else {
        setBcvErrorMsg("⚠️ No se pudo obtener respuesta del portal oficial. Se mantiene la última tasa registrada.");
      }
    } catch {
      setBcvErrorMsg("⚠️ Error de conexión intentando alcanzar la página oficial del BCV.");
    } finally {
      setSyncingBcv(false);
    }
  };

  const handleManualBcvSave = async () => {
    const num = parseFloat(bcvManualInput.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      alert("Por favor ingresa un número válido para la tasa.");
      return;
    }
    setSyncingBcv(true);
    setBcvStatusMsg("");
    setBcvErrorMsg("");
    try {
      const res = await fetch("/api/bcv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: num }),
      });
      const data = await res.json();
      if (data.ok) {
        setBcvRate(num);
        setBcvFechaValor("Fijada manualmente");
        setBcvStatusMsg(`Tasa manual guardada correctamente: Bs. ${num.toFixed(2)}`);
      } else {
        alert(data.error || "Error guardando la tasa.");
      }
    } catch {
      alert("Error de conexión guardando la tasa.");
    } finally {
      setSyncingBcv(false);
    }
  };

  useEffect(() => {
    setLogoUrl(theme.logoUrl || "");
    setWhatsappNumber(theme.whatsappNumber || "");
    setHeroTitle(theme.heroTitle || DEFAULT_SETTINGS.heroTitle);
    setHeroSubtitle(theme.heroSubtitle || DEFAULT_SETTINGS.heroSubtitle);
    setHeroHeight(theme.heroHeight || "md");
    setHeroSlides(theme.heroSlides || []);
    setDespachoText(theme.despachoText || DEFAULT_SETTINGS.despachoText);

    setFooterDescription(theme.footerDescription || DEFAULT_SETTINGS.footerDescription);
    setFooterSchedule(theme.footerSchedule || DEFAULT_SETTINGS.footerSchedule);
    setFooterDeliveryText(theme.footerDeliveryText || DEFAULT_SETTINGS.footerDeliveryText);
    setFooterBgColor(theme.footerBgColor || DEFAULT_SETTINGS.footerBgColor);
    setFooterTextColor(theme.footerTextColor || DEFAULT_SETTINGS.footerTextColor);

    setBottomNavBgColor(theme.bottomNavBgColor || DEFAULT_SETTINGS.bottomNavBgColor);
    setBottomNavTextColor(theme.bottomNavTextColor || DEFAULT_SETTINGS.bottomNavTextColor);
    setBottomNavActiveColor(theme.bottomNavActiveColor || DEFAULT_SETTINGS.bottomNavActiveColor);
    setNavLabelInicio(theme.navLabelInicio || DEFAULT_SETTINGS.navLabelInicio);
    setNavLabelCategorias(theme.navLabelCategorias || DEFAULT_SETTINGS.navLabelCategorias);
    setNavLabelCarrito(theme.navLabelCarrito || DEFAULT_SETTINGS.navLabelCarrito);
    setNavLabelBuscar(theme.navLabelBuscar || DEFAULT_SETTINGS.navLabelBuscar);
    setNavLabelDespachos(theme.navLabelDespachos || DEFAULT_SETTINGS.navLabelDespachos);

    setCardCategoryFontSize(theme.cardCategoryFontSize || DEFAULT_SETTINGS.cardCategoryFontSize || "11px");
    setCardTitleFontSize(theme.cardTitleFontSize || DEFAULT_SETTINGS.cardTitleFontSize || "13px");
    setCardMayorFontSize(theme.cardMayorFontSize || DEFAULT_SETTINGS.cardMayorFontSize || "15px");
    setCardGranMayorFontSize(theme.cardGranMayorFontSize || DEFAULT_SETTINGS.cardGranMayorFontSize || "14px");
    setCardPaddingY(theme.cardPaddingY || DEFAULT_SETTINGS.cardPaddingY || "4px");
    setCardPaddingX(theme.cardPaddingX || DEFAULT_SETTINGS.cardPaddingX || "10px");
    setCardLineSpacing(theme.cardLineSpacing || DEFAULT_SETTINGS.cardLineSpacing || "3px");
  }, [theme]);

  // Verifica con el servidor si ya hay una sesión de administrador válida
  useEffect(() => {
    let active = true;
    isAdminAuthenticated()
      .then((ok) => {
        if (active) {
          setIsAuthenticated(ok);
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const res = await loginAdmin(usernameInput, passwordInput);
      if (res.ok) {
        setIsAuthenticated(true);
        setPasswordInput("");
      } else {
        setAuthError(res.error || "Usuario o contraseña incorrectos");
      }
    } catch {
      setAuthError("No se pudo iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } finally {
      setIsAuthenticated(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTheme({
      logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
      whatsappNumber: whatsappNumber.trim().replace(/[^0-9]/g, ""),
      heroTitle: heroTitle.trim(),
      heroSubtitle: heroSubtitle.trim(),
      heroHeight,
      heroSlides,
      despachoText: despachoText.trim(),
      // Footer
      footerDescription: footerDescription.trim(),
      footerSchedule: footerSchedule.trim(),
      footerDeliveryText: footerDeliveryText.trim(),
      footerBgColor,
      footerTextColor,
      // Barra Inferior
      bottomNavBgColor,
      bottomNavTextColor,
      bottomNavActiveColor,
      navLabelInicio: navLabelInicio.trim(),
      navLabelCategorias: navLabelCategorias.trim(),
      navLabelCarrito: navLabelCarrito.trim(),
      navLabelBuscar: navLabelBuscar.trim(),
      navLabelDespachos: navLabelDespachos.trim(),
      // Tipografía y Márgenes de Tarjetas
      cardCategoryFontSize: cardCategoryFontSize.trim(),
      cardTitleFontSize: cardTitleFontSize.trim(),
      cardMayorFontSize: cardMayorFontSize.trim(),
      cardGranMayorFontSize: cardGranMayorFontSize.trim(),
      cardPaddingY: cardPaddingY.trim(),
      cardPaddingX: cardPaddingX.trim(),
      cardLineSpacing: cardLineSpacing.trim(),
    } as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { if (typeof reader.result === "string") setLogoUrl(reader.result); };
    reader.readAsDataURL(file);
  };

  const addSlide = () => setHeroSlides(prev => [...prev, { imageUrl: "", linkUrl: "", buttonText: "VER OFERTAS" }]);
  const removeSlide = (idx: number) => setHeroSlides(prev => prev.filter((_, i) => i !== idx));
  const updateSlide = (idx: number, field: keyof HeroSlide, val: string) =>
    setHeroSlides(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  const handleSlideFileUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        updateSlide(idx, "imageUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Mientras el servidor confirma la sesión, no se muestra nada
  if (!authChecked) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-sm text-slate-400">
        Verificando acceso...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col gap-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-rose-50 text-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Administrador</h1>
            <p className="text-xs text-slate-500 mt-1">Ingresa tus credenciales para configurar la tienda.</p>
          </div>
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Usuario" value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  autoComplete="username"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" placeholder="••••••••" value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  autoComplete="current-password"
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
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Panel de Configuración</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Personaliza todos los aspectos visuales de la tienda.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-sm transition-all"
          >
            <Package className="w-3.5 h-3.5 text-brand" />
            <span>Productos y Fotos</span>
          </Link>
          <Link
            href="/admin/carritos"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover shadow-sm transition-all"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Ver Carritos Abandonados</span>
          </Link>
          <button type="button" onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
            <LogOut className="w-3.5 h-3.5" /><span>Salir</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">



        {/* ── TASA OFICIAL BCV ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
                <Coins className="w-4 h-4 text-brand" /> Tasa Oficial del Dólar BCV
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                La tienda sincroniza automáticamente la tasa con el portal oficial del Banco Central de Venezuela (<a href="https://www.bcv.org.ve/" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold underline inline-flex items-center gap-0.5">bcv.org.ve <ExternalLink className="w-3 h-3" /></a>) cada 5 minutos.
              </p>
            </div>
            <button
              type="button"
              disabled={syncingBcv}
              onClick={handleSyncBcv}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${syncingBcv ? "animate-spin" : ""}`} />
              <span>{syncingBcv ? "Sincronizando..." : "Sincronizar con BCV ahora"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tasa Activa en Tienda</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5 flex items-baseline gap-1">
                  <span>Bs.</span>
                  <span>{bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                </div>
                {bcvFechaValor && (
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Fecha Valor: <strong className="text-slate-700">{bcvFechaValor}</strong>
                  </span>
                )}
                <div className="mt-2">
                  {isOfficialOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Conectado a bcv.org.ve
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Página oficial caída — Última actualización en uso
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Ajuste o Sobreescritura Manual
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Bs.</span>
                    <input
                      type="text"
                      value={bcvManualInput}
                      onChange={(e) => setBcvManualInput(e.target.value)}
                      placeholder="880.12"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={syncingBcv}
                    onClick={handleManualBcvSave}
                    className="h-10 px-4 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-50"
                  >
                    Fijar
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Usa esta opción solo si deseas congelar un valor específico.</p>
              </div>
            </div>
          </div>

          {bcvErrorMsg && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Notificación del sistema BCV:</span>
                <span>{bcvErrorMsg}</span>
              </div>
            </div>
          )}

          {bcvStatusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{bcvStatusMsg}</span>
            </div>
          )}
        </section>

        {/* ── LOGO Y CONTACTO ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
            <ImageIcon className="w-4 h-4 text-brand" /> Logo y Contacto
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Número de WhatsApp</label>
            <input type="text" value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="584XXXXXXXXX" />
            <p className="text-[11px] text-slate-400 mt-1">Con código de país, sin símbolo + ni espacios.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Logotipo</label>
            {logoUrl && <img src={logoUrl} alt="Preview" className="h-12 mb-3 object-contain" />}
            <input type="file" accept="image/*" onChange={handleLogoUpload}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 mb-2" />
            <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="https://i.imgur.com/tu-logo.png" />
            <p className="text-[11px] text-slate-400 mt-1">O pega un enlace público de imagen (Supabase Storage, Imgur…) — funcionará en todos los dispositivos.</p>
          </div>
        </section>

        {/* ── HERO SECTION ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
            <Layout className="w-4 h-4 text-brand" /> Sección Principal (Banner/Hero)
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Título principal</label>
            <input type="text" value={heroTitle} onChange={e => setHeroTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Subtítulo / descripción</label>
            <textarea value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Texto de Despachos (info rápida)</label>
            <input type="text" value={despachoText} onChange={e => setDespachoText(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Despacho Caracas / Guarenas / Guatire" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Altura del banner</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HEIGHT_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setHeroHeight(opt.value as any)}
                  className={`h-10 rounded-xl text-xs font-bold border transition-all ${heroHeight === opt.value ? "bg-brand text-white border-brand" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Carrusel de multimedia */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Multimedia del Carrusel</label>
                <p className="text-[11px] text-slate-400">Soporta Imágenes (JPG, PNG), GIFs animados y Videos (.mp4, .webm).</p>
              </div>
              <button type="button" onClick={addSlide}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-bold hover:bg-brand/20">
                <Plus className="w-3.5 h-3.5" /> Agregar slide
              </button>
            </div>
            {heroSlides.length === 0 && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-4 text-center">
                Sin multimedia — el banner mostrará el degradado con el color de marca.
              </p>
            )}
            <div className="space-y-4">
              {heroSlides.map((slide, idx) => {
                const isVideo = slide.imageUrl && slide.imageUrl.match(/\.(mp4|webm|ogg)($|\?)/i);
                return (
                  <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Slide {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSlide(idx)}
                        className="text-slate-400 hover:text-rose-500 text-xs font-bold flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Eliminar
                      </button>
                    </div>

                    {/* Previsualización multimedia */}
                    {slide.imageUrl && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                        {isVideo ? (
                          <video
                            src={slide.imageUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={slide.imageUrl}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                          {isVideo ? "Video" : "Imagen / GIF"}
                        </span>
                      </div>
                    )}

                    {/* Archivo o URL */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                        Subir archivo (Imagen, GIF o Video)
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={(e) => handleSlideFileUpload(idx, e)}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 mb-2"
                      />
                      <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                        O pega la URL directa del archivo
                      </label>
                      <input
                        type="url"
                        value={slide.imageUrl}
                        onChange={(e) => updateSlide(idx, "imageUrl", e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="https://... URL de Imagen, GIF animado o Video .mp4"
                      />
                    </div>

                    {/* Botón de acción y Redirección */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          Texto del Botón de la Oferta
                        </label>
                        <input
                          type="text"
                          value={slide.buttonText ?? "VER OFERTAS"}
                          onChange={(e) => updateSlide(idx, "buttonText", e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand/20"
                          placeholder="Ej: VER OFERTAS, COMPRAR AHORA"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          Enlace de Redirección
                        </label>
                        <div className="flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={slide.linkUrl || ""}
                            onChange={(e) => updateSlide(idx, "linkUrl", e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
                            placeholder="Ej: /categoria/envases o link"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── TIPOGRAFÍA Y MÁRGENES DE TARJETAS ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
                <Type className="w-4 h-4 text-brand" /> Tipografía y Márgenes de Tarjetas
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ajusta manualmente el tamaño de cada texto y los márgenes verticales para eliminar espacios innecesarios y optimizar la visibilidad.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand/10 text-brand self-start sm:self-auto">
              Tipografía: Roboto
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controles de ajuste */}
            <div className="lg:col-span-7 space-y-5">
              {/* Márgenes y Relleno Vertical */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-brand" /> Márgenes y Espaciado (Eliminar Espacio Perdido)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Margen Superior e Inferior (Arriba y Abajo)
                    </label>
                    <input
                      type="text"
                      value={cardPaddingY}
                      onChange={(e) => setCardPaddingY(e.target.value)}
                      placeholder="4px"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {["2px", "4px", "6px", "8px", "12px"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCardPaddingY(p)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${cardPaddingY === p ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Espacio entre Líneas / Bloques
                    </label>
                    <input
                      type="text"
                      value={cardLineSpacing}
                      onChange={(e) => setCardLineSpacing(e.target.value)}
                      placeholder="3px"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {["2px", "3px", "4px", "6px"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setCardLineSpacing(s)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${cardLineSpacing === s ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Margen Lateral (Izquierda y Derecha)
                  </label>
                  <input
                    type="text"
                    value={cardPaddingX}
                    onChange={(e) => setCardPaddingX(e.target.value)}
                    placeholder="10px"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {["6px", "8px", "10px", "12px", "14px"].map((pxVal) => (
                      <button
                        key={pxVal}
                        type="button"
                        onClick={() => setCardPaddingX(pxVal)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${cardPaddingX === pxVal ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                      >
                        {pxVal}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tamaños de Tipografía */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-brand" /> Tamaños de Tipografía (en píxeles px)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      1. Tamaño de Categoría (Negrita)
                    </label>
                    <input
                      type="text"
                      value={cardCategoryFontSize}
                      onChange={(e) => setCardCategoryFontSize(e.target.value)}
                      placeholder="11px"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {["9px", "10px", "11px", "12px", "13px"].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCardCategoryFontSize(sz)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${cardCategoryFontSize === sz ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      2. Tamaño Nombre de Producto (Normal)
                    </label>
                    <input
                      type="text"
                      value={cardTitleFontSize}
                      onChange={(e) => setCardTitleFontSize(e.target.value)}
                      placeholder="13px"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {["11px", "12px", "13px", "14px", "15px"].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCardTitleFontSize(sz)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${cardTitleFontSize === sz ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      3. Tamaño Precio Mayor ($ / Bs)
                    </label>
                    <input
                      type="text"
                      value={cardMayorFontSize}
                      onChange={(e) => setCardMayorFontSize(e.target.value)}
                      placeholder="15px"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {["13px", "14px", "15px", "16px", "18px"].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCardMayorFontSize(sz)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${cardMayorFontSize === sz ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      4. Tamaño Precio Gran Mayor (Recuadro Verde)
                    </label>
                    <input
                      type="text"
                      value={cardGranMayorFontSize}
                      onChange={(e) => setCardGranMayorFontSize(e.target.value)}
                      placeholder="14px"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {["12px", "13px", "14px", "15px", "16px"].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCardGranMayorFontSize(sz)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${cardGranMayorFontSize === sz ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vista Previa en Vivo */}
            <div className="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Vista Previa en Vivo
              </span>
              
              <div className="w-full max-w-[240px] bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
                {/* Mock Imagen */}
                <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=400&q=80"
                    alt="Muestra de producto"
                    className="w-full h-full object-cover"
                  />
                  {/* Botón '+' en esquina */}
                  <div className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-xl bg-brand text-white shadow-md flex items-center justify-center">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                </div>

                {/* Info con estilos en vivo */}
                <div
                  style={{
                    paddingTop: cardPaddingY,
                    paddingBottom: cardPaddingY,
                    paddingLeft: cardPaddingX,
                    paddingRight: cardPaddingX,
                  }}
                  className="flex flex-col"
                >
                  <div>
                    <p
                      style={{ fontSize: cardCategoryFontSize }}
                      className="font-bold text-brand leading-tight"
                    >
                      Bolsas para Café
                    </p>
                    <p
                      style={{ fontSize: cardTitleFontSize, marginTop: cardLineSpacing }}
                      className="font-bold text-slate-900 leading-snug line-clamp-2"
                    >
                      Bolsa Kraft 250gr con Válvula Desgasificadora
                    </p>
                  </div>

                  <div
                    style={{ marginTop: cardLineSpacing, paddingTop: cardLineSpacing }}
                    className="border-t border-slate-100"
                  >
                    <div style={{ gap: cardLineSpacing }} className="flex flex-col">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                          Mayor: 50Und
                        </span>
                        <div className="flex items-baseline gap-1 flex-wrap mt-0.5">
                          <span
                            style={{ fontSize: cardMayorFontSize }}
                            className="font-bold text-brand leading-tight"
                          >
                            $40.82
                          </span>
                          <span className="text-xs font-normal text-slate-900 leading-tight">
                            / Bs. 36.175,91
                          </span>
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100/80">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-medium text-slate-700 block leading-tight">
                            Gran Mayor: 150Und
                          </span>
                          <span className="inline-flex flex-col items-center justify-center bg-amber-200 text-amber-950 border border-amber-300/90 px-2 py-0.5 rounded-lg shadow-2xs text-center leading-none">
                            <span className="text-[9px] font-bold uppercase tracking-wide text-amber-900">Ahorras</span>
                            <span className="text-[11px] font-black text-amber-950 mt-0.5">$20.43</span>
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1 flex-wrap mt-0.5">
                          <span
                            style={{ fontSize: cardGranMayorFontSize }}
                            className="font-bold text-brand leading-tight"
                          >
                            $102.03
                          </span>
                          <span className="text-xs font-normal text-emerald-800 leading-tight">
                            / Bs. 90.437,35
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center mt-3">
                Los cambios se previsualizan aquí en tiempo real y se aplicarán al catálogo al pulsar <strong>Guardar Cambios</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* ── PIE DE PÁGINA (FOOTER) ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
            <Layout className="w-4 h-4 text-brand" /> Pie de Página (Footer)
          </h2>
          <p className="text-xs text-slate-500">
            Personaliza el texto informativo, horarios, cobertura y colores del final de la página.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Color de Fondo del Footer</label>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer flex-shrink-0">
                  <input type="color" value={footerBgColor}
                    onChange={e => setFooterBgColor(e.target.value)}
                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                </div>
                <input type="text" value={footerBgColor}
                  onChange={e => setFooterBgColor(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Color del Texto del Footer</label>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer flex-shrink-0">
                  <input type="color" value={footerTextColor}
                    onChange={e => setFooterTextColor(e.target.value)}
                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                </div>
                <input type="text" value={footerTextColor}
                  onChange={e => setFooterTextColor(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Descripción / Mensaje de la Empresa</label>
            <textarea value={footerDescription} onChange={e => setFooterDescription(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Descripción que aparece debajo del logo en el pie de página..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Horario de Atención (Multilínea)</label>
              <textarea value={footerSchedule} onChange={e => setFooterSchedule(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder={"Lunes a Viernes: 8:00 AM - 5:00 PM\nSábados: 8:00 AM - 1:00 PM"} />
              <p className="text-[11px] text-slate-400 mt-1">Presiona Enter para saltar de línea.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Texto de Zonas de Entrega</label>
              <input type="text" value={footerDeliveryText} onChange={e => setFooterDeliveryText(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="Despachos en Caracas, Guarenas y Guatire..." />
            </div>
          </div>
        </section>

        {/* ── BARRA INFERIOR MÓVIL ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
            <Layout className="w-4 h-4 text-brand" /> Barra Inferior Móvil (Navegación)
          </h2>
          <p className="text-xs text-slate-500">
            Personaliza los títulos y colores de los botones que ven los clientes en su celular.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Color de Fondo</label>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer flex-shrink-0">
                  <input type="color" value={bottomNavBgColor}
                    onChange={e => setBottomNavBgColor(e.target.value)}
                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                </div>
                <input type="text" value={bottomNavBgColor}
                  onChange={e => setBottomNavBgColor(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Color Texto / Íconos Inactivos</label>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer flex-shrink-0">
                  <input type="color" value={bottomNavTextColor}
                    onChange={e => setBottomNavTextColor(e.target.value)}
                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                </div>
                <input type="text" value={bottomNavTextColor}
                  onChange={e => setBottomNavTextColor(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Color Ícono Activo</label>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer flex-shrink-0">
                  <input type="color" value={bottomNavActiveColor}
                    onChange={e => setBottomNavActiveColor(e.target.value)}
                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                </div>
                <input type="text" value={bottomNavActiveColor}
                  onChange={e => setBottomNavActiveColor(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand/20" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Botón 1 (Inicio)</label>
              <input type="text" value={navLabelInicio} onChange={e => setNavLabelInicio(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Botón 2 (Categorías)</label>
              <input type="text" value={navLabelCategorias} onChange={e => setNavLabelCategorias(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Botón 3 (Carrito)</label>
              <input type="text" value={navLabelCarrito} onChange={e => setNavLabelCarrito(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Botón 4 (Buscar)</label>
              <input type="text" value={navLabelBuscar} onChange={e => setNavLabelBuscar(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Botón 5 (Despachos)</label>
              <input type="text" value={navLabelDespachos} onChange={e => setNavLabelDespachos(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>
          </div>
        </section>

        {/* ── BOTONES ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button type="button" onClick={resetTheme}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" /> Restaurar Valores por Defecto
          </button>
          <button type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-brand text-white font-black text-sm shadow-sm hover:bg-brand-hover active:bg-brand-active transition-all">
            {saved ? (
              <><CheckCircle2 className="w-4 h-4" /><span>¡Guardado!</span></>
            ) : (
              <><Save className="w-4 h-4" /><span>Guardar Cambios</span></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}