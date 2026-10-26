"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAdmin } from "@/lib/actions/auth";
import {
  Package,
  Settings,
  ShoppingCart,
  Activity,
  ExternalLink,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface AdminNavProps {
  onLogout?: () => void;
}

export const AdminNav: React.FC<AdminNavProps> = ({ onLogout }) => {
  const pathname = usePathname();

  const handleLogout = async () => {
    await logoutAdmin();
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  const navItems = [
    {
      label: "Productos y Variantes",
      shortLabel: "Productos",
      href: "/admin/productos",
      icon: Package,
      active: pathname === "/admin/productos" || pathname === "/admin",
    },
    {
      label: "Ajustes de Tienda",
      shortLabel: "Ajustes",
      href: "/admin/settings",
      icon: Settings,
      active: pathname === "/admin/settings" || pathname === "/settings",
    },
    {
      label: "Carritos y Pedidos",
      shortLabel: "Carritos",
      href: "/admin/carritos",
      icon: ShoppingCart,
      active: pathname === "/admin/carritos",
    },
    {
      label: "Estadísticas en Vivo",
      shortLabel: "Estadísticas",
      href: "/admin/estadisticas",
      icon: Activity,
      active: pathname === "/admin/estadisticas",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Barra Superior: Logo / Título + Accesos Rápidos */}
        <div className="h-14 flex items-center justify-between gap-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-white block leading-tight">
                Sumilisto Admin
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold block leading-tight">
                Panel Unificado de Control
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Tienda</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Pestañas Principales Unificadas */}
        <nav
          aria-label="Pestañas de Administración"
          className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  item.active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    item.active ? "text-white" : "text-slate-400"
                  }`}
                />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
