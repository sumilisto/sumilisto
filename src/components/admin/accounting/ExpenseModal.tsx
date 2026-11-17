"use client";

import React, { useState } from "react";
import { X, RefreshCcw, AlertCircle, CheckCircle2, Megaphone, Package, Truck, Wrench, Folder, DollarSign } from "lucide-react";
import { Expense, ExpenseCategory, PaymentMethod } from "@/types/accounting";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  bcvRate: number;
  usdtRate: number;
  onExpenseCreated: (expense: Expense) => void;
}

const CATEGORIES: { id: ExpenseCategory; label: string; icon: any; color: string }[] = [
  { id: "meta_ads", label: "Publicidad (Meta Ads)", icon: Megaphone, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "inventario", label: "Inventario / Proveedor", icon: Package, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { id: "flete", label: "Envíos / Fletes Extra", icon: Truck, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "servicios", label: "Servicios & Herramientas", icon: Wrench, color: "text-teal-600 bg-teal-50 border-teal-200" },
  { id: "otros", label: "Otros Gastos", icon: Folder, color: "text-slate-600 bg-slate-50 border-slate-200" },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "usdt", label: "🪙 USDT (Binance / Wallet)" },
  { id: "bs_pago_movil", label: "📲 Bolívares (Pago Móvil)" },
  { id: "bs_transferencia", label: "🏦 Bolívares (Transferencia)" },
  { id: "usd_efectivo", label: "💵 Dólares en Efectivo" },
  { id: "otro", label: "Otro Método" },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  bcvRate,
  usdtRate,
  onExpenseCreated,
}) => {
  const [categoria, setCategoria] = useState<ExpenseCategory>("meta_ads");
  const [concepto, setConcepto] = useState("");
  const [montoUsd, setMontoUsd] = useState("");
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>("usdt");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const numMontoUsd = Number(montoUsd) || 0;
  const approxBsBcv = numMontoUsd * bcvRate;
  const approxBsUsdt = numMontoUsd * usdtRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!concepto.trim()) {
      setErrorMsg("Ingresa una descripción o concepto del gasto.");
      return;
    }

    if (numMontoUsd <= 0) {
      setErrorMsg("El monto en USD debe ser mayor a cero.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          categoria,
          concepto: concepto.trim(),
          montoUsd: numMontoUsd,
          montoBs: metodoPago.startsWith("bs_") ? approxBsBcv : undefined,
          tasaCambio: metodoPago.startsWith("bs_") ? bcvRate : usdtRate,
          metodoPago,
          notas: notas.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        onExpenseCreated(data.expense);
        // Reset form
        setConcepto("");
        setMontoUsd("");
        setNotas("");
        onClose();
      } else {
        setErrorMsg(data.error || "No se pudo registrar el gasto.");
      }
    } catch {
      setErrorMsg("Error de conexión al guardar el gasto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Encabezado */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-black tracking-tight">+ Registrar Gasto / Egreso</h3>
            <p className="text-xs text-slate-300">Anota gastos publicitarios, compras o costos operativos</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Categoría Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              Categoría del Gasto
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = categoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoria(cat.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                      isSelected
                        ? "border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 text-slate-600"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concepto / Descripción */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
              Concepto / Descripción *
            </label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="ej. Meta Ads - Campaña Vasos Térmicos Semana 1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          {/* Monto y Fecha en 2 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                Monto en USD ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoUsd}
                  onChange={(e) => setMontoUsd(e.target.value)}
                  placeholder="25.00"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
              {numMontoUsd > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">
                  ≈ Bs. {approxBsBcv.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (BCV)
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
              Método de Pago Utilizado
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notas Adicionales */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
              Notas / Referencia (Opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="ej. Factura Meta #1234, pagado con tarjeta Zinli/Wally"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Gasto</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
