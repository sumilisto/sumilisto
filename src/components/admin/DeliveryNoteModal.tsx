"use client";

import React, { useEffect } from "react";
import { Order } from "@/types/order";
import { formatUsd, formatVes } from "@/lib/currency/format";
import { Printer, X, FileText, CheckCircle2 } from "lucide-react";

interface DeliveryNoteModalProps {
  order: Order | null;
  onClose: () => void;
  bcvRate?: number;
}

export function DeliveryNoteModal({ order, onClose, bcvRate = 880.12 }: DeliveryNoteModalProps) {
  useEffect(() => {
    if (!order) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const tasa = Number(order.tasaBcv) > 0 ? Number(order.tasaBcv) : bcvRate;
  const totalVesCalculated = order.totalVes > 0 ? order.totalVes : (order.totalUsd || 0) * tasa;
  const totalArticulos = (order.items || []).length;
  const totalUnidades = (order.items || []).reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);

  const orderDate = new Date(order.createdAt || Date.now());
  const fechaFormatted = orderDate.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const horaFormatted = orderDate.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      {/* Botones de acción fijos en pantalla (no imprimibles) */}
      <div className="w-full max-w-4xl my-auto space-y-3">
        <div className="no-print flex items-center justify-between bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black tracking-wide text-white font-mono">
                NOTA DE ENTREGA · {order.codigo}
              </p>
              <p className="text-[10px] text-slate-300">
                Vista previa de documento imprimible para despacho y cliente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Imprimir documento en impresora o guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* DOCUMENTO IMPRIMIBLE: NOTA DE ENTREGA                       */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div
          id="delivery-note-printable"
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-10 text-slate-800 space-y-6"
        >
          {/* Encabezado Principal */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <img
                  src="/logo-green.png"
                  alt="Sumilisto"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    // Fallback visual si la imagen tarda en cargar
                    e.currentTarget.style.display = "none";
                  }}
                />
                <h1 className="text-2xl font-black text-emerald-950 tracking-tight">
                  SUMILISTO
                </h1>
              </div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Insumos, Envases y Empaques al Mayor
              </p>
              <div className="text-[11px] text-slate-500 space-y-0.5 leading-snug">
                <p>📍 Despachos a Nivel Nacional · Caracas, Miranda y toda Venezuela</p>
                <p>📱 WhatsApp Ventas: +58 412-9960903 · Web: www.sumilisto.shop</p>
                <p>📸 Instagram: @sumilisto.ve</p>
              </div>
            </div>

            {/* Recuadro de Identificación del Documento */}
            <div className="w-full sm:w-64 p-3.5 rounded-xl border-2 border-emerald-800 bg-emerald-50/60 text-right space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-950 tracking-widest block">
                NOTA DE ENTREGA
              </span>
              <p className="text-xl font-black font-mono text-emerald-900 leading-none">
                {order.codigo}
              </p>
              <div className="text-[10px] text-slate-600 pt-1 border-t border-emerald-200/80 space-y-0.5">
                <p>
                  Fecha: <strong className="text-slate-800 font-bold">{fechaFormatted}</strong>
                </p>
                <p>
                  Hora: <strong className="text-slate-800 font-bold">{horaFormatted}</strong>
                </p>
                <p>
                  Estado:{" "}
                  <strong className="text-emerald-800 font-black uppercase">
                    {order.estado}
                  </strong>
                </p>
                <p className="text-[9px] text-slate-500">
                  {order.origen === "web" ? "Pedido Tienda Web" : "Pedido Carga Manual"}
                </p>
              </div>
            </div>
          </div>

          {/* Cuadrícula de Datos del Cliente y Despacho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Tarjeta Cliente */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                DATOS DEL CLIENTE
              </span>
              <p className="text-sm font-black text-slate-900 leading-snug">
                {order.clienteNombre || "Cliente General"}
              </p>
              <p className="text-slate-700">
                <span className="font-bold text-slate-500">Teléfono / WhatsApp:</span>{" "}
                <span className="font-mono font-bold text-slate-800">{order.clienteTelefono || "No registrado"}</span>
              </p>
              <p className="text-slate-700">
                <span className="font-bold text-slate-500">Método de Pago:</span>{" "}
                <span className="font-medium text-slate-800">{order.metodoPago || "Acordado con el vendedor"}</span>
                {order.referenciaPago ? (
                  <span className="font-mono font-bold text-slate-700 ml-1">
                    (Ref: {order.referenciaPago})
                  </span>
                ) : null}
              </p>
            </div>

            {/* Tarjeta Despacho */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                DESTINO Y ENTREGA
              </span>
              <p className="text-sm font-black text-slate-900 leading-snug">
                {order.zonaEntrega || "Por coordinar"}
              </p>
              <p className="text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-500">Dirección:</span>{" "}
                <span className="font-medium text-slate-800">{order.direccion || "Por coordinar con el cliente"}</span>
              </p>
              <p className="text-[11px] text-emerald-800 font-bold">
                Modalidad:{" "}
                {order.zonaEntrega?.toLowerCase().includes("nacional")
                  ? "Envío Nacional (Cobro en Destino por encomienda)"
                  : "Despacho Directo / Entrega Local"}
              </p>
            </div>
          </div>

          {/* Tabla de Artículos Entregados */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Descripción del Producto</th>
                  <th className="py-2.5 px-3">Presentación / Color</th>
                  <th className="py-2.5 px-3 text-center">Tarifa</th>
                  <th className="py-2.5 px-3 text-center">Cant.</th>
                  <th className="py-2.5 px-3 text-right">P. Unit ($)</th>
                  <th className="py-2.5 px-3 text-right">Subtotal ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {(order.items || []).map((it, idx) => {
                  const unitPrice = Number(it.precioUnitarioUsd) || (Number(it.cantidad) > 0 ? (Number(it.subtotalUsd) / Number(it.cantidad)) : 0);
                  const subtotal = Number(it.subtotalUsd) || (unitPrice * (Number(it.cantidad) || 0));

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 text-[11px]">
                        {it.sku || "N/A"}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {it.nombre}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">
                        {it.presentacion || it.color || "Estándar"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {it.tarifa === "gran_mayor" ? "Gran Mayor" : "Mayor"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-black text-slate-900 text-sm">
                        {it.cantidad}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700">
                        {formatUsd(unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">
                        {formatUsd(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumen de Totales y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
            {/* Observaciones y Notas */}
            <div className="space-y-2 text-xs">
              {order.notas ? (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                  <span className="text-[10px] font-black uppercase text-amber-900 block mb-0.5">
                    Observaciones del Pedido:
                  </span>
                  <p className="text-amber-950 font-medium leading-relaxed">
                    {order.notas}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-500 text-[11px]">
                  <span>Sin observaciones adicionales registradas.</span>
                </div>
              )}

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Resumen de Carga:</span>
                <span className="font-black text-slate-800">
                  {totalArticulos} {totalArticulos === 1 ? "artículo" : "artículos"} · {totalUnidades} unidades en total
                </span>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                * Documento interno de entrega y control de despacho de mercancía al por mayor.
              </p>
            </div>

            {/* Recuadro de Totales */}
            <div className="rounded-xl border-2 border-slate-300 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Subtotal Mercancía:</span>
                <span className="font-bold text-slate-800">{formatUsd(order.totalUsd)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Tasa Oficial BCV Aplicada:</span>
                <span className="font-bold text-slate-700">Bs. {tasa.toFixed(2)} / USD</span>
              </div>

              <div className="border-t border-slate-300 pt-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-800">Total a Pagar (USD):</span>
                <span className="text-xl font-black text-emerald-900 font-mono">
                  {formatUsd(order.totalUsd)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="text-slate-600">Total en Bolívares (VES):</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {formatVes(totalVesCalculated)}
                </span>
              </div>
            </div>
          </div>

          {/* Sección de Conformidad y Firmas */}
          <div className="border-t border-slate-200 pt-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-6 text-center">
              CONSTANCIA DE DESPACHO Y RECEPCIÓN CONFORME
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              {/* Despacho */}
              <div className="text-center space-y-1">
                <div className="border-b border-slate-400 pb-1 mb-1 h-12" />
                <p className="font-black text-slate-800 text-[11px] uppercase">Despachado por (Sumilisto)</p>
                <p className="text-[10px] text-slate-500">Nombre, Firma y Sello</p>
              </div>

              {/* Transporte */}
              <div className="text-center space-y-1">
                <div className="border-b border-slate-400 pb-1 mb-1 h-12" />
                <p className="font-black text-slate-800 text-[11px] uppercase">Transporte / Delivery</p>
                <p className="text-[10px] text-slate-500">Conductor / C.I. / Encomienda</p>
              </div>

              {/* Cliente */}
              <div className="text-center space-y-1">
                <div className="border-b border-slate-400 pb-1 mb-1 h-12" />
                <p className="font-black text-slate-800 text-[11px] uppercase">Recibido Conforme (Cliente)</p>
                <p className="text-[10px] text-slate-500">Nombre, C.I./RIF y Firma</p>
              </div>
            </div>
          </div>

          {/* Mensaje al pie */}
          <div className="border-t border-slate-100 pt-3 text-center">
            <p className="text-[10px] text-slate-500 font-medium">
              Por favor revise el estado y la cantidad de sus bultos al momento de la entrega. ¡Gracias por confiar en <strong>SUMILISTO</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Estilos específicos de impresión */}
      <style jsx global>{`
        @media print {
          /* Ocultar todo en la página excepto el documento de entrega */
          body * {
            visibility: hidden !important;
          }
          #delivery-note-printable,
          #delivery-note-printable * {
            visibility: visible !important;
          }
          #delivery-note-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: portrait;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
