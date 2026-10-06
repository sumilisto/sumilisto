import React from "react";
import Link from "next/link";
import { ChevronRight, HelpCircle, MessageCircle, Truck, DollarSign, Package } from "lucide-react";

export const metadata = {
  title: "Preguntas Frecuentes | Sumilisto Venezuela",
  description: "Dudas frecuentes sobre compras al mayor, despachos en Caracas, Guarenas y Guatire, y pedidos por WhatsApp.",
};

export default function FAQPage() {
  const faqs = [
    {
      q: "¿Cómo funciona el pedido a través de la tienda y WhatsApp?",
      a: "Navegas por nuestro catálogo en línea, seleccionas las cantidades de bultos o cajas que requieres para tu negocio y agregas al pedido. Al hacer clic en 'Enviar Pedido por WhatsApp', se generará automáticamente un mensaje con la lista desglosada y el total referencial. Un asesor comercial verificará inventario y te indicará los pasos de pago y coordinación del despacho.",
      icon: MessageCircle,
    },
    {
      q: "¿Cuáles son las zonas de despacho y tiempos de entrega?",
      a: "Realizamos despachos directos en la Gran Caracas, Guarenas y Guatire, habitualmente en un lapso de 24 a 48 horas tras la confirmación del pago. Para el interior del país, enviamos por las principales empresas de encomienda (Tealca, MRW, Zoom) con cobro en destino.",
      icon: Truck,
    },
    {
      q: "¿Cuál es la diferencia entre el precio al Mayor y Gran Mayor?",
      a: "El precio al Mayor aplica desde la compra mínima de 1 bulto, fardo o caja. El precio al Gran Mayor ofrece un descuento adicional por volumen, generalmente a partir de 4 a 10 unidades según la presentación del producto.",
      icon: DollarSign,
    },
    {
      q: "¿Qué métodos de pago aceptan?",
      a: "Aceptamos Pago Móvil y transferencias bancarias en bolívares a tasa oficial BCV, dólares en efectivo (contra entrega o retiro en almacén), Binance Pay (USDT) y Zelle.",
      icon: Package,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900">Inicio</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900">Preguntas Frecuentes</span>
      </nav>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#590317] flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Preguntas Frecuentes (FAQ)
          </h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">
          Respuestas rápidas para compradores de restaurantes, franquicias y servicios de alimentos.
        </p>

        <div className="divide-y divide-slate-100">
          {faqs.map((faq, idx) => {
            const Icon = faq.icon;
            return (
              <div key={idx} className="py-5 first:pt-0 last:pb-0">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-[#590317] flex-shrink-0" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
