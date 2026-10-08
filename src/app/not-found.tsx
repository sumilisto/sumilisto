import React from "react";
import Link from "next/link";
import { PackageX, ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center flex flex-col items-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center text-brand mb-6">
        <PackageX className="w-10 h-10" />
      </div>

      <span className="text-xs font-bold text-brand uppercase tracking-wider">
        Error 404
      </span>
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
        Página o producto no encontrado
      </h1>

      <p className="text-sm text-slate-500 mt-3 max-w-md">
        Es posible que el producto haya sido retirado temporalmente del catálogo o que la dirección web haya cambiado.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Link
          href="/"
          className="h-11 px-5 rounded-xl bg-brand text-white font-bold text-sm flex items-center gap-2 hover:bg-brand-hover transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Ir al inicio</span>
        </Link>
        <Link
          href="/#categorias"
          className="h-11 px-5 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Ver categorías</span>
        </Link>
      </div>
    </div>
  );
}
