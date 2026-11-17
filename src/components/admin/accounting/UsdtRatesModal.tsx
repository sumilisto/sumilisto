"use client";

import React, { useState } from "react";
import { X, RefreshCcw, Coins, TrendingUp, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { UsdtRates } from "@/types/accounting";

interface UsdtRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRates: UsdtRates;
  bcvRate: number;
  onRatesUpdated: (rates: UsdtRates) => void;
}

export const UsdtRatesModal: React.FC<UsdtRatesModalProps> = ({
  isOpen,
  onClose,
  currentRates,
  bcvRate,
  onRatesUpdated,
}) => {
  const [tasaCompra, setTasaCompra] = useState<string>(String(currentRates.tasaCompraUsdt || ""));
  const [tasaVenta, setTasaVenta] = useState<string>(String(currentRates.tasaVentaUsdt || ""));
  const [saving, setSaving] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveInfo, setLiveInfo] = useState<{
    rate: number;
    fuente: string;
    tasaCompra: number;
    tasaVenta: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const numCompra = Number(tasaCompra) || 0;
  const numVenta = Number(tasaVenta) || 0;

  const handleFetchLiveRate = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setFetchingLive(true);
    try {
      const res = await fetch("/api/accounting/usdt/live");
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        setTasaCompra(String(json.data.tasaCompra));
        setTasaVenta(String(json.data.tasaVenta));
        setLiveInfo(json.data);
        setSuccessMsg(`¡Tasa de ${json.data.fuente} cargada: Bs. ${json.data.rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}!`);
      } else {
        setErrorMsg("No se pudo obtener la tasa en vivo en este momento.");
      }
    } catch {
      setErrorMsg("Error al consultar el mercado P2P.");
    } finally {
      setFetchingLive(false);
    }
  };

  // Brecha cambiaria con respecto al BCV oficial
  const brechaCompra = bcvRate > 0 && numCompra > 0 ? (((numCompra - bcvRate) / bcvRate) * 100).toFixed(2) : "0.00";
  const brechaVenta = bcvRate > 0 && numVenta > 0 ? (((numVenta - bcvRate) / bcvRate) * 100).toFixed(2) : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (numCompra <= 0 || numVenta <= 0) {
      setErrorMsg("Las tasas de compra y venta deben ser números mayores a cero.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/accounting/usdt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasaCompraUsdt: numCompra,
          tasaVentaUsdt: numVenta,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg("¡Tasas USDT actualizadas exitosamente!");
        onRatesUpdated(data.rates);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(data.error || "No se pudieron actualizar las tasas.");
      }
    } catch {
      setErrorMsg("Error de conexión al guardar tasas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Encabezado */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Tasas de Referencia USDT</h3>
              <p className="text-xs text-slate-300">Control de cambio P2P y brecha cambiaria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Comparativa Tasa BCV Oficial */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tasa Oficial BCV Activa</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">Bs. {bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              Oficial bcv.org.ve
            </span>
          </div>

          {/* Sincronización Automática cada 5 min desde Binance P2P */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-sincronizado cada 5 minutos</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-900 text-[10px] font-bold">
                  {liveInfo?.fuente || "Binance P2P"}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                {liveInfo
                  ? `Última cotización del mercado: Bs. ${liveInfo.rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })} por USDT`
                  : "Se actualiza automáticamente en segundo plano. Puedes forzar actualización o fijar tasas manuales."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleFetchLiveRate}
              disabled={fetchingLive}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${fetchingLive ? "animate-spin" : ""}`} />
              <span>{fetchingLive ? "Consultando P2P..." : "⚡ Actualizar Ahora"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tasa Compra USDT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Tasa Compra USDT (P2P)
                <span className="block text-[10px] font-normal text-slate-500">Lo que pagas en Bs para recibir 1 USDT</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Bs.</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tasaCompra}
                  onChange={(e) => setTasaCompra(e.target.value)}
                  placeholder="ej. 935.00"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
              {numCompra > 0 && (
                <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Brecha BCV: +{brechaCompra}%</span>
                </div>
              )}
            </div>

            {/* Tasa Venta USDT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Tasa Venta USDT (P2P)
                <span className="block text-[10px] font-normal text-slate-500">Lo que recibes en Bs al vender 1 USDT</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Bs.</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tasaVenta}
                  onChange={(e) => setTasaVenta(e.target.value)}
                  placeholder="ej. 925.00"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
              {numVenta > 0 && (
                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <span>Spread con compra: {(numCompra - numVenta).toFixed(2)} Bs</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
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
                <span>Fijar Tasas USDT</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
