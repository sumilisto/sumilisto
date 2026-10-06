import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad | Sumilisto",
  description: "Tratamiento de datos personales y privacidad en Sumilisto Venezuela.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900">Inicio</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900">Política de Privacidad</span>
      </nav>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight not-prose mb-4">
          Política de Privacidad
        </h1>

        <p>
          En <strong>Sumilisto</strong> nos comprometemos a resguardar la privacidad de nuestros clientes comerciales, adoptando una política de recolección mínima de datos.
        </p>

        <h3 className="text-slate-900 font-bold mt-4">1. Principio de Cero Almacenamiento de Datos Sensibles</h3>
        <p>
          Nuestros servidores web <strong>no recopilan ni almacenan</strong> nombres, direcciones personales, números de teléfono ni datos bancarios de los compradores. Los datos del formulario de entrega únicamente viajan de manera encriptada y directa en el mensaje de WhatsApp que usted envía voluntariamente a nuestro número oficial.
        </p>

        <h3 className="text-slate-900 font-bold mt-4">2. Uso de Almacenamiento Local (LocalStorage)</h3>
        <p>
          Utilizamos el almacenamiento local de su navegador exclusivamente para recordar los artículos seleccionados en su pedido durante un período máximo de 48 horas, permitiendo que no pierda su lista si recarga o cierra la ventana.
        </p>

        <h3 className="text-slate-900 font-bold mt-4">3. Contacto de Privacidad</h3>
        <p>
          Para cualquier duda sobre el tratamiento de datos o seguridad, puede escribir a: <strong>seguridad@sumilisto.com</strong>.
        </p>
      </div>
    </div>
  );
}
