import React from "react";
import Link from "next/link";
import { DEFAULT_STORE_CONFIG, STORE_CATEGORIES } from "@/lib/constants/brand";
import { MessageCircle, MapPin, Clock, ShieldCheck, Truck, Phone } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-24 sm:pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Columna 1: Marca y Propósito */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-black text-xl shadow-md">
                S
              </div>
              <span className="text-xl font-black text-white tracking-tight">SUMILISTO</span>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Tu aliado confiable en suministros y empaques al Mayor y Gran Mayor para restaurantes, cadenas de comida rápida y servicios de alimentos en Venezuela.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Compra directa y confirmación en tiempo real por WhatsApp</span>
            </div>
          </div>

          {/* Columna 2: Categorías Rápidas */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-3">
              Suministros al Mayor
            </h4>
            <ul className="space-y-2 text-sm">
              {STORE_CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categoria/${cat.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {cat.nombre}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/" className="text-rose-300 hover:text-white transition-colors font-medium">
                  Ver todo el catálogo →
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Cobertura y Horarios */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-3">
              Zonas de Entrega
            </h4>
            <div className="space-y-2.5 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>Despachos en <strong>Caracas, Guarenas y Guatire</strong>. Envíos nacionales por encomienda.</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{DEFAULT_STORE_CONFIG.schedule}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>Venezuela</span>
              </div>
            </div>
          </div>

          {/* Columna 4: Contacto Directo */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-3">
              Atención al Cliente
            </h4>
            <p className="text-sm text-slate-400 mb-3">
              ¿Requieres cotización para gran volumen o tienes dudas sobre un pedido?
            </p>
            <a
              href={`https://wa.me/${DEFAULT_STORE_CONFIG.whatsappNumber}?text=Hola%20Sumilisto,%20deseo%20atención%20para%20mi%20negocio`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp: +58 422 789 4547</span>
            </a>
          </div>
        </div>

        {/* Separador y Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} Sumilisto. Todos los derechos reservados. Suministros para restaurantes en Venezuela.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="hover:text-slate-400 transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-slate-400 transition-colors">
              Privacidad
            </Link>
            <Link href="/preguntas-frecuentes" className="hover:text-slate-400 transition-colors">
              Preguntas Frecuentes
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
