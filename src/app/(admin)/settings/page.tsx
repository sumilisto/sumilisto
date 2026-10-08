"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Save, RefreshCcw, Image as ImageIcon, Palette } from "lucide-react";

export default function AdminSettingsPage() {
  const { theme, updateTheme, resetTheme } = useTheme();
  
  const [brandColor, setBrandColor] = useState(theme.brandColor);
  const [logoUrl, setLogoUrl] = useState(theme.logoUrl || "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBrandColor(theme.brandColor);
    setLogoUrl(theme.logoUrl || "");
  }, [theme]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTheme({
      brandColor,
      logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Configuración de Marca
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Personaliza los colores y el logotipo principal de la tienda.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        
        {/* Color de Marca */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <Palette className="w-4 h-4 text-brand" />
            <span>Color Principal de la Marca</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-inner border-2 border-slate-200 cursor-pointer">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 uppercase"
                placeholder="#590317"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <ImageIcon className="w-4 h-4 text-brand" />
            <span>Logotipo de la Tienda</span>
          </label>
          
          <div className="space-y-4">
            {logoUrl && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block">
                <img src={logoUrl} alt="Logo Preview" className="h-16 object-contain" />
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium">Subir imagen (PNG/JPG recomendado):</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-brand/10 file:text-brand
                  hover:file:bg-brand/20 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">O usar una URL de imagen:</span>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={resetTheme}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Restaurar Valores por Defecto
          </button>
          
          <button
            type="submit"
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-brand text-white font-bold text-sm shadow-sm hover:bg-brand-hover active:bg-brand-active transition-all"
          >
            <Save className="w-4 h-4" />
            {saved ? "Guardado" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
