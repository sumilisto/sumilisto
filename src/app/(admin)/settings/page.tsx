"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { DEFAULT_SETTINGS, HeroSlide } from "@/lib/constants/settings";
import {
  Save, RefreshCcw, Image as ImageIcon, Palette, Phone, Lock,
  User, LogOut, CheckCircle2, Type, Layout, Truck, Plus, X, Link as LinkIcon,
} from "lucide-react";

const COLOR_FIELDS = [
  { key: "brandColor", label: "Color Principal (Header, botones)", desc: "Color dominante de la marca" },
  { key: "navBgColor", label: "Fondo del Encabezado / Navegación", desc: "Fondo del header y nav inferior" },
  { key: "bgColor", label: "Fondo General de la Página", desc: "Color de fondo base de toda la web" },
  { key: "cardBgColor", label: "Fondo de Tarjetas de Producto", desc: "Fondo de cada tarjeta en el catálogo" },
  { key: "textColor", label: "Color de Texto Principal", desc: "Color del texto más importante" },
  { key: "accentColor", label: "Color de Acento / Destacado", desc: "Usado en badges y etiquetas especiales" },
] as const;

const HEIGHT_OPTIONS = [
  { value: "sm", label: "Pequeño (compacto)" },
  { value: "md", label: "Mediano (por defecto)" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra grande" },
];

export default function AdminSettingsPage() {
  const { theme, updateTheme, resetTheme } = useTheme();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  useEffect(() => {
    const c: Record<string, string> = {};
    COLOR_FIELDS.forEach(f => { c[f.key] = (theme as any)[f.key] || (DEFAULT_SETTINGS as any)[f.key]; });
    setColors(c);
    setLogoUrl(theme.logoUrl || "");
    setWhatsappNumber(theme.whatsappNumber || "");
    setHeroTitle(theme.heroTitle || DEFAULT_SETTINGS.heroTitle);
    setHeroSubtitle(theme.heroSubtitle || DEFAULT_SETTINGS.heroSubtitle);
    setHeroHeight(theme.heroHeight || "md");
    setHeroSlides(theme.heroSlides || []);
    setDespachoText(theme.despachoText || DEFAULT_SETTINGS.despachoText);
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("sumilisto_admin_auth") === "true") setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().toLowerCase() === "admin" &&
        (passwordInput === "sumilisto2024" || passwordInput === "Sumilisto2024")) {
      setIsAuthenticated(true);
      sessionStorage.setItem("sumilisto_admin_auth", "true");
    } else {
      setAuthError("Usuario o contraseña incorrectos");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("sumilisto_admin_auth");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTheme({
      ...colors,
      brandColor: colors.brandColor,
      navBgColor: colors.navBgColor,
      bgColor: colors.bgColor,
      cardBgColor: colors.cardBgColor,
      textColor: colors.textColor,
      accentColor: colors.accentColor,
      logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
      whatsappNumber: whatsappNumber.trim().replace(/[^0-9]/g, ""),
      heroTitle: heroTitle.trim(),
      heroSubtitle: heroSubtitle.trim(),
      heroHeight,
      heroSlides,
      despachoText: despachoText.trim(),
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

  const addSlide = () => setHeroSlides(prev => [...prev, { imageUrl: "", linkUrl: "" }]);
  const removeSlide = (idx: number) => setHeroSlides(prev => prev.filter((_, i) => i !== idx));
  const updateSlide = (idx: number, field: keyof HeroSlide, val: string) =>
    setHeroSlides(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));

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
                <input type="text" placeholder="admin" value={usernameInput}
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
          <button type="submit" className="w-full h-11 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover">Iniciar Sesión</button>
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
        <button type="button" onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
          <LogOut className="w-3.5 h-3.5" /><span>Salir</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* ── PALETA DE COLORES ── */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">
            <Palette className="w-4 h-4 text-brand" /> Paleta de Colores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COLOR_FIELDS.map(field => (
              <div key={field.key}>
                <label className="text-xs font-bold text-slate-700 block mb-1">{field.label}</label>
                <p className="text-[11px] text-slate-400 mb-2">{field.desc}</p>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer flex-shrink-0">
                    <input type="color" value={colors[field.key] || "#590317"}
                      onChange={e => setColors(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                  </div>
                  <input type="text" value={colors[field.key] || ""}
                    onChange={e => setColors(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 uppercase"
                    placeholder="#590317" />
                </div>
              </div>
            ))}
          </div>
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
              placeholder="584227894547" />
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
            <p className="text-[11px] text-slate-400 mt-1">O pega un enlace público (Imgur, Cloudinary…) — funcionará en todos los dispositivos.</p>
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

          {/* Carrusel de imágenes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">Imágenes del Carrusel</label>
              <button type="button" onClick={addSlide}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-bold hover:bg-brand/20">
                <Plus className="w-3.5 h-3.5" /> Agregar imagen
              </button>
            </div>
            {heroSlides.length === 0 && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-4 text-center">
                Sin imágenes — el banner mostrará el degradado de color de marca.
              </p>
            )}
            <div className="space-y-3">
              {heroSlides.map((slide, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600">Imagen {idx + 1}</span>
                    <button type="button" onClick={() => removeSlide(idx)} className="text-slate-400 hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input type="url" value={slide.imageUrl}
                    onChange={e => updateSlide(idx, "imageUrl", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="https://... URL de la imagen" />
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <input type="text" value={slide.linkUrl || ""}
                      onChange={e => updateSlide(idx, "linkUrl", e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
                      placeholder="Link al hacer clic (ej: /categoria/envases)" />
                  </div>
                </div>
              ))}
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
