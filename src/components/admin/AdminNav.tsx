"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme/ThemeContext";
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
  const { theme } = useTheme();

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

  const brandBg = theme.navBgColor || "#14532D";

  return (
    <header
      className="sticky top-0 z-40 w-full text-white shadow-md border-b border-emerald-950/20"
      style={{ backgroundColor: brandBg }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Barra Superior: Logo Oficial de la Marca / Título + Accesos Rápidos */}
        <div className="h-14 flex items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <img
                src={theme.logoUrl || "/logo.png"}
                alt="Sumilisto"
                className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="border-l border-white/20 pl-2.5">
                <span className="font-black text-xs sm:text-sm tracking-tight text-white block leading-tight">
                  Admin
                </span>
                <span className="text-[10px] text-emerald-200 font-medium block leading-tight">
                  Panel de Control
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Tienda</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-100 hover:text-white bg-rose-500/20 hover:bg-rose-600 border border-rose-400/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Pestañas Principales con Colores de la Marca */}
        <nav
          aria-label="Pestañas de Administración"
          className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  item.active
                    ? "bg-white text-emerald-900 shadow-sm font-black"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    item.active ? "text-emerald-800" : "text-white/70"
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
