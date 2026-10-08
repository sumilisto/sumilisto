"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Save, RefreshCcw, Image as ImageIcon, Palette, Phone, Lock, User, LogOut, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  const { theme, updateTheme, resetTheme } = useTheme();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [brandColor, setBrandColor] = useState(theme.brandColor);
  const [logoUrl, setLogoUrl] = useState(theme.logoUrl || "");
  const [whatsappNumber, setWhatsappNumber] = useState(theme.whatsappNumber || "584227894547");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Verificar si ya había iniciado sesión en esta sesión
    if (typeof window !== "undefined") {
      const isAuth = sessionStorage.getItem("sumilisto_admin_auth");
      if (isAuth === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  useEffect(() => {
    setBrandColor(theme.brandColor);
    setLogoUrl(theme.logoUrl || "");
    setWhatsappNumber(theme.whatsappNumber || "584227894547");
  }, [theme]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (cleanUser === "admin" && (cleanPass === "sumilisto2024" || cleanPass === "Sumilisto2024" || cleanPass === "Sumilisto2024*")) {
      setIsAuthenticated(true);
      setAuthError("");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("sumilisto_admin_auth", "true");
      }
    } else {
      setAuthError("Usuario o contraseña incorrectos");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsernameInput("");
    setPasswordInput("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("sumilisto_admin_auth");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTheme({
      brandColor,
      logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
      whatsappNumber: whatsappNumber.trim().replace(/[^0-9]/g, ""),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col gap-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-rose-50 text-brand rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Administrador</h1>
            <p className="text-xs text-slate-500 mt-1">Ingresa tus credenciales para configurar la tienda.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="admin"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {authError}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-11 mt-1 rounded-xl bg-brand text-white font-bold text-sm shadow-sm hover:bg-brand-hover active:bg-brand-active transition-all"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Panel de Configuración
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Personaliza los datos de WhatsApp, el logotipo y la paleta de colores de Sumilisto.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        
        {/* 1. Teléfono de WhatsApp */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
            <Phone className="w-4 h-4 text-brand" />
            <span>Número de WhatsApp para Pedidos y Atención</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              placeholder="584227894547"
              required
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Ingresa el número con el código de país (ejemplo para Venezuela: <strong>584121234567</strong> o <strong>584241234567</strong>), sin el signo más (+) ni espacios. Este número recibirá todos los pedidos del carrito y consultas.
          </p>
        </div>

        {/* 2. Color Principal de Marca */}
        <div className="pt-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
            <Palette className="w-4 h-4 text-brand" />
            <span>Color Principal de la Marca</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-200 cursor-pointer flex-shrink-0">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="absolute -top-3 -left-3 w-20 h-20 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 uppercase"
                placeholder="#590317"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Aplica a botones, encabezados, badges y detalles clave de toda la tienda. Por defecto: Vinotinto (<code>#590317</code>).
          </p>
        </div>

        {/* 3. Logotipo de la Tienda */}
        <div className="pt-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
            <ImageIcon className="w-4 h-4 text-brand" />
            <span>Logotipo de la Tienda</span>
          </label>
          
          <div className="space-y-4">
            {logoUrl && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-block">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Vista previa:</span>
                <img src={logoUrl} alt="Logo Preview" className="h-14 w-auto object-contain" />
              </div>
            )}
            
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-600 font-semibold">Opción 1: Subir imagen (PNG/JPG):</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-xs text-slate-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-xl file:border-0
                  file:text-xs file:font-bold
                  file:bg-brand/10 file:text-brand
                  hover:file:bg-brand/20 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-600 font-semibold">Opción 2: O colocar enlace web directo (URL) del logo:</span>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="https://i.imgur.com/tu-logo.png"
              />
              <p className="text-[11px] text-slate-400">
                Recomendado: Una URL pública directa (ej. Imgur o Cloudinary) garantiza que el logo cargue rápidamente en cualquier teléfono o computadora.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetTheme}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors order-2 sm:order-1"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Restaurar Valores por Defecto
          </button>
          
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-brand text-white font-black text-sm shadow-sm hover:bg-brand-hover active:bg-brand-active transition-all order-1 sm:order-2"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>¡Guardado con éxito!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
