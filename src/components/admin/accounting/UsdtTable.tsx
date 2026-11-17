"use client";

import React, { useState, useMemo } from "react";
import { Plus, Settings2, Trash2, ArrowDownLeft, ArrowUpRight, Handshake, Coins, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { UsdtTransaction, UsdtRates, UsdtTxType } from "@/types/accounting";
import { formatUsd } from "@/lib/currency/format";

interface UsdtTableProps {
  transactions: UsdtTransaction[];
  rates: UsdtRates;
  bcvRate: number;
  onOpenCreateModal: () => void;
  onOpenRatesModal: () => void;
  onTransactionDeleted: (id: string) => void;
}

export const UsdtTable: React.FC<UsdtTableProps> = ({
  transactions,
  rates,
  bcvRate,
  onOpenCreateModal,
  onOpenRatesModal,
  onTransactionDeleted,
}) => {
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Métricas de Tesorería USDT
  const totalComprado = transactions
    .filter((t) => t.tipo === "compra")
    .reduce((acc, t) => acc + (t.montoUsdt || 0), 0);

  const totalBsGastadosEnCompra = transactions
    .filter((t) => t.tipo === "compra")
    .reduce((acc, t) => acc + (t.montoBs || (t.montoUsdt * (t.tasaBsPorUsdt || 0))), 0);

  const tasaPonderadaCompra = totalComprado > 0 ? (totalBsGastadosEnCompra / totalComprado).toFixed(2) : null;

  const totalVendido = transactions
    .filter((t) => t.tipo === "venta")
    .reduce((acc, t) => acc + (t.montoUsdt || 0), 0);

  const totalPagadoProveedor = transactions
    .filter((t) => t.tipo === "pago_proveedor")
    .reduce((acc, t) => acc + (t.montoUsdt || 0), 0);

  const saldoDisponibleUsdt = totalComprado - totalVendido - totalPagadoProveedor;

  const ahorroTotalProveedor = transactions
    .filter((t) => t.tipo === "pago_proveedor")
    .reduce((acc, t) => acc + (t.ahorroUsd || 0), 0);

  // Brecha cambiaria vs BCV
  const brechaCompra = bcvRate > 0 && rates.tasaCompraUsdt > 0
    ? (((rates.tasaCompraUsdt - bcvRate) / bcvRate) * 100).toFixed(1)
    : "0.0";

  // Filtros
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      return filterTipo === "todos" || t.tipo === filterTipo;
    });
  }, [transactions, filterTipo]);

  const handleDelete = async (id: string, tipo: string) => {
    if (!confirm(`¿Estás seguro de eliminar esta operación de ${tipo}?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/accounting/usdt?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onTransactionDeleted(id);
      } else {
        alert("No se pudo eliminar la operación.");
      }
    } catch {
      alert("Error de conexión al eliminar.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* TARJETAS RESUMEN DE TESORERÍA USDT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Estimado USDT */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-800/40 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Saldo Estimado en USDT</span>
            <Coins className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-emerald-300 mt-1">₮ {saldoDisponibleUsdt.toFixed(2)}</p>
          <p className="text-[11px] text-slate-300 mt-1">
            Comprado: ₮{totalComprado.toFixed(0)} · Egresos: ₮{(totalVendido + totalPagadoProveedor).toFixed(0)}
          </p>
        </div>

        {/* Tasa Ponderada de Compra */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Tasa Ponderada de Compra</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {tasaPonderadaCompra ? `Bs. ${Number(tasaPonderadaCompra).toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Costo promedio por cada USDT respaldado
          </p>
        </div>

        {/* Ahorro por pagar en USDT */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-5 rounded-2xl border border-purple-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-purple-900 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Ahorro con Proveedores</span>
            <Handshake className="w-4 h-4 text-purple-700" />
          </div>
          <p className="text-2xl font-black text-purple-900 mt-1">+{formatUsd(ahorroTotalProveedor)}</p>
          <p className="text-xs text-purple-800 font-medium mt-1">
            Descuentos ganados por pagar en USDT
          </p>
        </div>

        {/* Tasas de Referencia */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Tasas Activas P2P</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenRatesModal}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
                >
                  <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                  <span>En vivo</span>
                </button>
                <button
                  onClick={onOpenRatesModal}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer p-0.5"
                  title="Ajustar tasas"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs text-slate-400 font-bold">Compra:</span>
              <span className="text-sm font-black text-slate-900">Bs. {rates.tasaCompraUsdt}</span>
              <span className="text-xs text-slate-400 font-bold ml-1">Venta:</span>
              <span className="text-sm font-black text-slate-900">Bs. {rates.tasaVentaUsdt}</span>
            </div>
          </div>
          <p className="text-[10px] text-amber-700 font-bold mt-2">
            Brecha P2P vs BCV: +{brechaCompra}% (BCV Bs. {bcvRate.toFixed(2)})
          </p>
        </div>
      </div>

      {/* CONTENEDOR DE TABLA DE OPERACIONES */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-700" />
              <span>Historial de Operaciones USDT ({filtered.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro de compras en Bs para respaldar ventas y pagos a proveedores con descuento
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filtro Tipo */}
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-emerald-600"
            >
              <option value="todos">Todas las Operaciones</option>
              <option value="compra">🟢 Compras de USDT</option>
              <option value="venta">🔴 Ventas de USDT</option>
              <option value="pago_proveedor">🟣 Pagos a Proveedores</option>
            </select>

            <button
              onClick={onOpenRatesModal}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Fijar Tasas USDT</span>
            </button>

            <button
              onClick={onOpenCreateModal}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Registrar Operación USDT</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Coins className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-600">No hay operaciones USDT registradas</p>
              <p className="text-xs text-slate-400 mt-1">
                Registra compras de USDT con los bolívares de tus ventas o pagos a tus proveedores con descuento.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Monto USDT</th>
                  <th className="py-3 px-4">Tasa Pactada</th>
                  <th className="py-3 px-4">Bolívares (Bs)</th>
                  <th className="py-3 px-4">Detalle / Proveedor</th>
                  <th className="py-3 px-4">Plataforma</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((item) => {
                  const isDeleting = deletingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {item.fecha}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.tipo === "compra" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" /> Compra USDT
                          </span>
                        )}
                        {item.tipo === "venta" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3" /> Venta USDT
                          </span>
                        )}
                        {item.tipo === "pago_proveedor" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            <Handshake className="w-3 h-3" /> Pago Proveedor
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p
                          className={`font-black text-sm ${
                            item.tipo === "compra"
                              ? "text-emerald-700"
                              : item.tipo === "venta"
                              ? "text-rose-700"
                              : "text-purple-800"
                          }`}
                        >
                          {item.tipo === "compra" ? "+" : "-"}₮{item.montoUsdt.toFixed(2)}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {item.tasaBsPorUsdt
                          ? `Bs. ${item.tasaBsPorUsdt.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {item.montoBs
                          ? `Bs. ${item.montoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.tipo === "pago_proveedor" ? (
                          <div>
                            <p className="font-extrabold text-slate-900">{item.proveedorNombre || "Proveedor"}</p>
                            {item.ahorroUsd ? (
                              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                Ahorro: +${item.ahorroUsd.toFixed(2)} ({item.descuentoPorcentaje || 0}%)
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {item.plataforma || "Binance P2P"}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {item.referencia || item.notas || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id, item.tipo)}
                          disabled={isDeleting}
                          title="Eliminar operación"
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
