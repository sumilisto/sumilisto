"use client";

import React from "react";
import Link from "next/link";
import { DEFAULT_STORE_CONFIG, STORE_CATEGORIES } from "@/lib/constants/brand";
import { DEFAULT_SETTINGS } from "@/lib/constants/settings";
import { useTheme } from "@/lib/theme/ThemeContext";
import { MessageCircle, MapPin, Clock, ShieldCheck, Truck, Phone, Instagram } from "lucide-react";

export const Footer: React.FC = () => {
  const { theme } = useTheme();
  const whatsappNum = theme.whatsappNumber || DEFAULT_STORE_CONFIG.whatsappNumber;
  const instagramUrl = theme.instagramUrl || "https://www.instagram.com/sumilisto_/";
  const instagramHandle = theme.instagramHandle || "sumilisto_";
  const footerBg = theme.footerBgColor || "#0f172a";
  const footerText = theme.footerTextColor || "#94a3b8";

  return (
    <footer
      style={{ backgroundColor: footerBg, color: footerText }}
      className="pt-12 pb-24 sm:pb-12 border-t border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Columna 1: Marca y Propósito */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src={theme.logoUrl || "/logo.png"}
                alt="Logo"
                className="h-10 w-auto object-contain rounded-md"
              />
            </div>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: footerText }}>
              {theme.footerDescription || DEFAULT_SETTINGS.footerDescription}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: footerText }}>
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Compra directa y confirmación en tiempo real por WhatsApp</span>
            </div>
          </div>

          {/* Columna 2: Cobertura y Horarios */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-3">
              Zonas de Entrega y Horarios
            </h4>
            <div className="space-y-3 text-sm" style={{ color: footerText }}>
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{theme.footerDeliveryText || DEFAULT_SETTINGS.footerDeliveryText}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="whitespace-pre-line leading-relaxed">
                  {theme.footerSchedule || DEFAULT_SETTINGS.footerSchedule}
                </div>
              </div>
            </div>
          </div>

          {/* Columna 3: Contacto Directo y Redes */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-3">
              Atención y Redes Sociales
            </h4>
            <p className="text-sm mb-3.5" style={{ color: footerText }}>
              ¿Requieres cotización para gran volumen o tienes dudas sobre un pedido?
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href={`https://wa.me/${whatsappNum}?text=Hola%20Sumilisto,%20deseo%20atención%20para%20mi%20negocio`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm transition-all shadow-sm hover:scale-[1.01]"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span>WhatsApp: +{whatsappNum}</span>
              </a>

              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 text-white font-semibold text-sm transition-all shadow-sm hover:scale-[1.01]"
              >
                <Instagram className="w-4 h-4 flex-shrink-0" />
                <span>Instagram: @{instagramHandle}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Separador y Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div style={{ color: footerText }}>
            © {new Date().getFullYear()} Sumilisto. Todos los derechos reservados. Suministros para restaurantes en Venezuela.
          </div>
          <div className="flex items-center gap-4">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-pink-400 transition-colors font-semibold"
              style={{ color: footerText }}
              title="Síguenos en Instagram @sumilisto_"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>@{instagramHandle}</span>
            </a>
            <Link href="/terminos" className="hover:text-white transition-colors" style={{ color: footerText }}>
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-white transition-colors" style={{ color: footerText }}>
              Privacidad
            </Link>
            <Link href="/preguntas-frecuentes" className="hover:text-white transition-colors" style={{ color: footerText }}>
              Preguntas Frecuentes
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
