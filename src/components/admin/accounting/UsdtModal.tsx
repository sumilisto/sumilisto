"use client";

import React, { useState, useEffect } from "react";
import { X, RefreshCcw, AlertCircle, ArrowDownLeft, ArrowUpRight, Handshake, CheckCircle2, Zap } from "lucide-react";
import { UsdtTransaction, UsdtTxType, UsdtRates } from "@/types/accounting";

interface UsdtModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: UsdtRates;
  onTransactionCreated: (tx: UsdtTransaction) => void;
}

export const UsdtModal: React.FC<UsdtModalProps> = ({
  isOpen,
  onClose,
  rates,
  onTransactionCreated,
}) => {
  const [tipo, setTipo] = useState<UsdtTxType>("compra");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);

  // Compra / Venta
  const [montoBs, setMontoBs] = useState("");
  const [montoUsdt, setMontoUsdt] = useState("");
  const [tasaBsPorUsdt, setTasaBsPorUsdt] = useState("");
  const [plataforma, setPlataforma] = useState("Binance P2P");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");

  // Pago Proveedor con Descuento
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [montoOriginalUsd, setMontoOriginalUsd] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("5");

  const [saving, setSaving] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLiveRateForModal = async () => {
    setFetchingLive(true);
    try {
      const res = await fetch("/api/accounting/usdt/live");
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        const rateToUse = tipo === "venta" ? json.data.tasaVenta : json.data.tasaCompra;
        handleTasaChange(String(rateToUse));
      }
    } catch (e) {
      console.warn("Error fetching live rate:", e);
    } finally {
      setFetchingLive(false);
    }
  };

  // Auto-llenar tasa según el tipo
  useEffect(() => {
    if (tipo === "compra") {
      setTasaBsPorUsdt(String(rates.tasaCompraUsdt || 935));
    } else if (tipo === "venta") {
      setTasaBsPorUsdt(String(rates.tasaVentaUsdt || 925));
    }
  }, [tipo, rates]);

  // Recalcular montos al cambiar inputs en compra
  const handleBsChange = (val: string) => {
    setMontoBs(val);
    const bs = Number(val);
    const tasa = Number(tasaBsPorUsdt);
    if (bs > 0 && tasa > 0) {
      setMontoUsdt((bs / tasa).toFixed(2));
    } else {
      setMontoUsdt("");
    }
  };

  const handleTasaChange = (val: string) => {
    setTasaBsPorUsdt(val);
    const tasa = Number(val);
    if (tipo === "compra") {
      const bs = Number(montoBs);
      if (bs > 0 && tasa > 0) {
        setMontoUsdt((bs / tasa).toFixed(2));
      }
    } else if (tipo === "venta") {
      const usdt = Number(montoUsdt);
      if (usdt > 0 && tasa > 0) {
        setMontoBs((usdt * tasa).toFixed(2));
      }
    }
  };

  const handleUsdtChange = (val: string) => {
    setMontoUsdt(val);
    const usdt = Number(val);
    const tasa = Number(tasaBsPorUsdt);
    if (tipo === "venta" && usdt > 0 && tasa > 0) {
      setMontoBs((usdt * tasa).toFixed(2));
    } else if (tipo === "compra" && usdt > 0 && tasa > 0) {
      setMontoBs((usdt * tasa).toFixed(2));
    }
  };

  // Cálculos de descuento a proveedor
  const numFacturaOriginal = Number(montoOriginalUsd) || 0;
  const numDescuentoPorc = Number(descuentoPorcentaje) || 0;
  const ahorroCalculado = Math.round(numFacturaOriginal * (numDescuentoPorc / 100) * 100) / 100;
  const usdtAPagarProveedor = Math.round((numFacturaOriginal - ahorroCalculado) * 100) / 100;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    let payload: Partial<UsdtTransaction> = {
      fecha,
      tipo,
      plataforma,
      referencia: referencia.trim() || undefined,
      notas: notas.trim() || undefined,
    };

    if (tipo === "compra" || tipo === "venta") {
      const parsedUsdt = Number(montoUsdt);
      const parsedTasa = Number(tasaBsPorUsdt);
      const parsedBs = Number(montoBs);

      if (parsedUsdt <= 0) {
        setErrorMsg("Ingresa una cantidad de USDT válida.");
        return;
      }
      if (parsedTasa <= 0) {
        setErrorMsg("Ingresa la tasa pactada en Bs por USDT.");
        return;
      }

      payload = {
        ...payload,
        montoUsdt: parsedUsdt,
        tasaBsPorUsdt: parsedTasa,
        montoBs: parsedBs > 0 ? parsedBs : parsedUsdt * parsedTasa,
      };
    } else if (tipo === "pago_proveedor") {
      if (!proveedorNombre.trim()) {
        setErrorMsg("Ingresa el nombre del proveedor.");
        return;
      }
      if (numFacturaOriginal <= 0) {
        setErrorMsg("Ingresa el monto de la factura del proveedor.");
        return;
      }

      payload = {
        ...payload,
        proveedorNombre: proveedorNombre.trim(),
        montoOriginalUsd: numFacturaOriginal,
        descuentoPorcentaje: numDescuentoPorc,
        ahorroUsd: ahorroCalculado,
        montoUsdt: usdtAPagarProveedor,
      };
    }

    setSaving(true);
    try {
      const res = await fetch("/api/accounting/usdt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        onTransactionCreated(data.transaction);
        onClose();
      } else {
        setErrorMsg(data.error || "No se pudo registrar la operación USDT.");
      }
    } catch {
      setErrorMsg("Error de conexión al registrar operación.");
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
            <h3 className="text-base font-black tracking-tight">+ Registrar Operación USDT</h3>
            <p className="text-xs text-slate-300">Compra, venta de USDT o pago a proveedor con descuento</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Tipo de Operación */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTipo("compra")}
            className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              tipo === "compra"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Comprar USDT</span>
          </button>

          <button
            type="button"
            onClick={() => setTipo("venta")}
            className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              tipo === "venta"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Vender USDT</span>
          </button>

          <button
            type="button"
            onClick={() => setTipo("pago_proveedor")}
            className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              tipo === "pago_proveedor"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>Pago Proveedor</span>
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

          {/* 1. COMPRA DE USDT (Cambias Bs por USDT) */}
          {tipo === "compra" && (
            <>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed">
                💡 <strong>Respaldar en USDT:</strong> Cambias los bolívares cobrados por pedidos a USDT en Binance P2P u otra wallet para protegerte de la devaluación.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Bolívares Entregados (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={montoBs}
                    onChange={(e) => handleBsChange(e.target.value)}
                    placeholder="ej. 93500.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tasa Pactada (Bs. / USDT) *
                    </label>
                    <button
                      type="button"
                      onClick={fetchLiveRateForModal}
                      disabled={fetchingLive}
                      className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-emerald-100/70 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 transition-colors"
                      title="Obtener tasa P2P en vivo"
                    >
                      <Zap className={`w-3 h-3 text-emerald-600 ${fetchingLive ? "animate-spin" : "fill-emerald-600"}`} />
                      <span>{fetchingLive ? "..." : "P2P en vivo"}</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tasaBsPorUsdt}
                    onChange={(e) => handleTasaChange(e.target.value)}
                    placeholder="ej. 935.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-900 block mb-1 uppercase tracking-wider">
                  USDT Recibidos en Billetera *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600">₮</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={montoUsdt}
                    onChange={(e) => handleUsdtChange(e.target.value)}
                    placeholder="100.00"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 font-black text-base text-emerald-950 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>
            </>
          )}

          {/* 2. VENTA DE USDT (Cambias USDT por Bs) */}
          {tipo === "venta" && (
            <>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed">
                💡 <strong>Venta de USDT:</strong> Vendes USDT de tu saldo para obtener liquidez en bolívares (pago de servicios locales, envíos o compras en Bs).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    USDT a Vender *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₮</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={montoUsdt}
                      onChange={(e) => handleUsdtChange(e.target.value)}
                      placeholder="100.00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white font-black text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-600/20 focus:border-rose-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tasa Pactada (Bs. / USDT) *
                    </label>
                    <button
                      type="button"
                      onClick={fetchLiveRateForModal}
                      disabled={fetchingLive}
                      className="text-[10px] font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer bg-rose-100/70 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300 transition-colors"
                      title="Obtener tasa P2P en vivo"
                    >
                      <Zap className={`w-3 h-3 text-rose-600 ${fetchingLive ? "animate-spin" : "fill-rose-600"}`} />
                      <span>{fetchingLive ? "..." : "P2P en vivo"}</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tasaBsPorUsdt}
                    onChange={(e) => handleTasaChange(e.target.value)}
                    placeholder="ej. 925.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-600/20 focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                  Bolívares Recibidos (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoBs}
                  onChange={(e) => handleBsChange(e.target.value)}
                  placeholder="ej. 92500.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-slate-50 font-black text-base text-slate-900 focus:outline-none focus:border-slate-700"
                />
              </div>
            </>
          )}

          {/* 3. PAGO A PROVEEDOR EN USDT CON DESCUENTO */}
          {tipo === "pago_proveedor" && (
            <>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 leading-relaxed">
                🤝 <strong>Descuento por pagar en USDT:</strong> Registra la compra a tu proveedor pagando en USDT. El sistema calcula automáticamente el descuento obtenido y lo suma a tus ahorros.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  required
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                  placeholder="ej. Plasticorp C.A., Distribuidora Mayorista"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Factura Original ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={montoOriginalUsd}
                    onChange={(e) => setMontoOriginalUsd(e.target.value)}
                    placeholder="500.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-black text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    % Descuento por USDT
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={descuentoPorcentaje}
                      onChange={(e) => setDescuentoPorcentaje(e.target.value)}
                      placeholder="5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-black text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {numFacturaOriginal > 0 && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Monto Final en USDT</span>
                    <p className="text-xl font-black text-purple-950 mt-0.5">₮ {usdtAPagarProveedor.toFixed(2)} USDT</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">🎉 Tu Ahorro Ganado</span>
                    <p className="text-xl font-black text-emerald-600 mt-0.5">+${ahorroCalculado.toFixed(2)} USD</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Campos comunes: Plataforma, Fecha, Referencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                Plataforma / Billetera
              </label>
              <select
                value={plataforma}
                onChange={(e) => setPlataforma(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              >
                <option value="Binance P2P">Binance P2P</option>
                <option value="El Dorado P2P">El Dorado P2P</option>
                <option value="Zinli / Wally">Zinli / Wally</option>
                <option value="Wallet Externa (TRC20/BEP20)">Wallet Externa (TRC20 / BEP20)</option>
                <option value="Efectivo USDT">Efectivo / Mano a mano</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                Fecha de Operación
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

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
              Referencia / Comprobante (Opcional)
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="ej. Orden Binance #20491823, TXID o notas"
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
                <span>Guardar Operación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
