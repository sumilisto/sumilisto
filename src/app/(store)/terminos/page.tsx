import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones | Sumilisto",
  description: "Términos comerciales y condiciones de compra para suministros mayoristas en Sumilisto.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900">Inicio</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900">Términos y Condiciones</span>
      </nav>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight not-prose mb-4">
          Términos y Condiciones de Venta Mayorista
        </h1>

        <p>
          Bienvenido a <strong>Sumilisto</strong>. Al utilizar nuestro catálogo digital y emitir pedidos a través de WhatsApp, usted acepta los siguientes términos comerciales:
        </p>

        <h3 className="text-slate-900 font-bold mt-4">1. Naturaleza del Servicio</h3>
        <p>
          Sumilisto es un catálogo informativo de venta al Mayor y Gran Mayor. La plataforma en línea no procesa pagos con tarjeta ni almacena datos financieros. La ordenación final y formalización de la compraventa ocurre mediante comunicación directa por WhatsApp con nuestros asesores autorizados.
        </p>

        <h3 className="text-slate-900 font-bold mt-4">2. Precios y Tasa de Cambio</h3>
        <p>
          Los precios base están estipulados en Dólares de los Estados Unidos (USD). El monto referencial en Bolívares (Bs.) se calcula a la tasa oficial publicada por el Banco Central de Venezuela (BCV) vigente al momento de concretar y liquidar el pedido.
        </p>

        <h3 className="text-slate-900 font-bold mt-4">3. Disponibilidad y Despacho</h3>
        <p>
          Las cantidades de stock mostradas son referenciales. El inventario exacto queda reservado y confirmado únicamente cuando el asesor de ventas aprueba el pedido por WhatsApp y se coordina la entrega en Caracas, Guarenas, Guatire o envíos nacionales.
        </p>
      </div>
    </div>
  );
}
