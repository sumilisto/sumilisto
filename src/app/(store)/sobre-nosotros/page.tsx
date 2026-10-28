import React from "react";
import Link from "next/link";
import { ChevronRight, Award, ShieldCheck, Truck, Users, Instagram } from "lucide-react";

export const metadata = {
  title: "Sobre Nosotros | Sumilisto Venezuela",
  description: "Conoce a Sumilisto, distribuidores de empaques, vasos, descartables, cajas, bolsas y suministros al mayor para negocios, comercios y eventos en Caracas, Guarenas, Guatire y envíos nacionales.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900">Inicio</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900">Sobre Nosotros</span>
      </nav>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-6">
        <div>
          <span className="text-xs font-bold text-brand uppercase tracking-wider">
            Nuestra Empresa
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Sumilisto: El aliado de los negocios, comercios y eventos en Venezuela
          </h1>
        </div>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          En <strong>Sumilisto</strong> nos especializamos en abastecer a comercios, empresas, emprendimientos, eventos, cafeterías, reposterías y negocios de comida rápida con empaques, vasos, descartables, cajas y bolsas de alta calidad a precios competitivos de distribución al Mayor y Gran Mayor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <Truck className="w-6 h-6 text-brand mb-2" />
            <h3 className="font-bold text-sm text-slate-900">Despachos Eficientes</h3>
            <p className="text-xs text-slate-500 mt-1">Rutas programadas en Caracas, Guarenas, Guatire y envíos nacionales.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <Award className="w-6 h-6 text-brand mb-2" />
            <h3 className="font-bold text-sm text-slate-900">Calidad Certificada</h3>
            <p className="text-xs text-slate-500 mt-1">Materiales de primera calidad para uso comercial y grado alimenticio.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <Users className="w-6 h-6 text-brand mb-2" />
            <h3 className="font-bold text-sm text-slate-900">Atención Personalizada</h3>
            <p className="text-xs text-slate-500 mt-1">Asesoría comercial directa e inmediata vía WhatsApp.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Conoce nuestras novedades, fotos de catálogo y despachos en tiempo real en nuestra cuenta oficial.
          </p>
          <a
            href="https://www.instagram.com/sumilisto_/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02]"
          >
            <Instagram className="w-4 h-4" />
            <span>Seguir en Instagram @sumilisto_</span>
          </a>
        </div>
      </div>
    </div>
  );
}
