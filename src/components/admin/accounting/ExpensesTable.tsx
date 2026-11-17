"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, Trash2, Megaphone, Package, Truck, Wrench, Folder, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Expense, ExpenseCategory } from "@/types/accounting";
import { formatUsd } from "@/lib/currency/format";

interface ExpensesTableProps {
  expenses: Expense[];
  facturacionTotal: number;
  onOpenCreateModal: () => void;
  onExpenseDeleted: (id: string) => void;
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: any; color: string }> = {
  meta_ads: { label: "Meta Ads", icon: Megaphone, color: "bg-blue-100 text-blue-800 border-blue-200" },
  inventario: { label: "Inventario", icon: Package, color: "bg-purple-100 text-purple-800 border-purple-200" },
  flete: { label: "Fletes", icon: Truck, color: "bg-amber-100 text-amber-800 border-amber-200" },
  servicios: { label: "Servicios", icon: Wrench, color: "bg-teal-100 text-teal-800 border-teal-200" },
  otros: { label: "Otros", icon: Folder, color: "bg-slate-100 text-slate-800 border-slate-200" },
};

const PAYMENT_LABELS: Record<string, string> = {
  usdt: "🪙 USDT",
  bs_pago_movil: "📲 Pago Móvil",
  bs_transferencia: "🏦 Transferencia",
  usd_efectivo: "💵 Efectivo USD",
  otro: "Otro",
};

export const ExpensesTable: React.FC<ExpensesTableProps> = ({
  expenses,
  facturacionTotal,
  onOpenCreateModal,
  onExpenseDeleted,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCat, setFilterCat] = useState<string>("todos");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Totales y métricas de gastos
  const totalGastos = expenses.reduce((acc, e) => acc + (e.montoUsd || 0), 0);
  const gastoMetaAds = expenses
    .filter((e) => e.categoria === "meta_ads")
    .reduce((acc, e) => acc + (e.montoUsd || 0), 0);
  const gastoOtros = totalGastos - gastoMetaAds;

  // ROAS (Return On Ad Spend): Facturación total / Inversión en Ads
  const roas = gastoMetaAds > 0 ? (facturacionTotal / gastoMetaAds).toFixed(2) : null;
  const porcMetaAds = totalGastos > 0 ? Math.round((gastoMetaAds / totalGastos) * 100) : 0;

  // Filtros de búsqueda
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCat = filterCat === "todos" || e.categoria === filterCat;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        e.concepto.toLowerCase().includes(term) ||
        (e.notas && e.notas.toLowerCase().includes(term));
      return matchesCat && matchesSearch;
    });
  }, [expenses, filterCat, searchTerm]);

  const handleDelete = async (id: string, concepto: string) => {
    if (!confirm(`¿Estás seguro de eliminar el gasto "${concepto}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/accounting/expenses?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onExpenseDeleted(id);
      } else {
        alert("No se pudo eliminar el gasto.");
      }
    } catch {
      alert("Error de conexión al eliminar.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* TARJETAS RESUMEN DE GASTOS & ROAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Total Gastos Operativos
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">{formatUsd(totalGastos)}</p>
          <p className="text-xs text-slate-500 mt-1">{expenses.length} gastos registrados</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider">
              Inversión en Meta Ads
            </span>
            <Megaphone className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-1">{formatUsd(gastoMetaAds)}</p>
          <p className="text-xs text-blue-700 font-medium mt-1">
            Representa el {porcMetaAds}% de tus egresos
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
              ROAS Publicitario (Retorno)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          {roas ? (
            <>
              <p className="text-2xl font-black text-emerald-900 mt-1">{roas}x</p>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                Por cada $1 en Meta Ads generas {formatUsd(Number(roas))} en ventas
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-400 mt-1">—</p>
              <p className="text-xs text-slate-500 mt-1">Registra gastos en Meta Ads para calcular retorno</p>
            </>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Otros Egresos (Insumos/Fletes)
          </span>
          <p className="text-2xl font-black text-slate-800 mt-1">{formatUsd(gastoOtros)}</p>
          <p className="text-xs text-slate-500 mt-1">Compras, servicios e imprevistos</p>
        </div>
      </div>

      {/* CONTENEDOR DE TABLA DE GASTOS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Cabecera de la tabla */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-emerald-700" />
              <span>Libro de Gastos & Publicidad ({filtered.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control transparente de cada centavo invertido en ads, inventario y logística
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar gasto o nota..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-600 w-44 sm:w-56"
              />
            </div>

            {/* Filtro Categoría */}
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-emerald-600"
            >
              <option value="todos">Todas las Categorías</option>
              <option value="meta_ads">📢 Meta Ads</option>
              <option value="inventario">📦 Inventario / Proveedor</option>
              <option value="flete">🚚 Fletes Extra</option>
              <option value="servicios">🛠️ Servicios</option>
              <option value="otros">📁 Otros</option>
            </select>

            {/* Botón Nuevo Gasto */}
            <button
              onClick={onOpenCreateModal}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Registrar Gasto</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-600">No hay gastos registrados en este período</p>
              <p className="text-xs text-slate-400 mt-1">
                Haz clic en &quot;+ Registrar Gasto&quot; para registrar lo que has invertido en Meta Ads o insumos.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Concepto / Detalle</th>
                  <th className="py-3 px-4">Monto ($ USD)</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4">Notas</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((item) => {
                  const cfg = CATEGORY_CONFIG[item.categoria] || CATEGORY_CONFIG.otros;
                  const Icon = cfg.icon;
                  const isDeleting = deletingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {item.fecha}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${cfg.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900">{item.concepto}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-black text-rose-700 text-sm">-{formatUsd(item.montoUsd)}</p>
                        {item.montoBs && (
                          <p className="text-[10px] text-slate-400">
                            Bs. {item.montoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-600 whitespace-nowrap">
                        {PAYMENT_LABELS[item.metodoPago] || item.metodoPago}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {item.notas || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id, item.concepto)}
                          disabled={isDeleting}
                          title="Eliminar gasto"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
