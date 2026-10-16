'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Trash2, Plus, Minus, MessageCircle, MapPin, ArrowLeft,
  Navigation, ExternalLink, AlertCircle, Check, X,
} from 'lucide-react';
import { useCart } from '@/lib/cart/CartContext';
import { useProducts } from '@/lib/products/ProductsContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { formatUsd } from '@/lib/currency/format';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=600&q=80';

interface Line {
  sku: string;
  nombre: string;
  presentacion: string;
  foto: string;
  cantidad: number; // unidades
  step: number; // unidades que suben o bajan con + y -
  maxStock: number;
  precioPaquete: number; // precio de un paquete completo
  unidadesPorPaquete: number;
  subtotal: number;
  nivel: 'mayor' | 'gran_mayor';
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, markAsSentWhatsApp } = useCart();
  const { products, bcvRate } = useProducts();
  const { theme } = useTheme();

  // Formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [zonaEntrega, setZonaEntrega] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [notas, setNotas] = useState('');

  // GPS y validación
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [customMapsUrl, setCustomMapsUrl] = useState('');
  const [showManualMapsInput, setShowManualMapsInput] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState('');
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let currentSession = localStorage.getItem('sumilisto_cart_session_id');
      if (!currentSession) {
        currentSession = 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('sumilisto_cart_session_id', currentSession);
      }
      setSessionId(currentSession);
    }
  }, []);

  // Une el carrito (sku + cantidad en unidades) con los datos del producto
  const lines: Line[] = useMemo(() => {
    const result: Line[] = [];
    for (const item of items) {
      if (item.cantidad <= 0) continue;

      let product = products.find((p) => p.sku === item.sku);
      let variant = product?.variantes?.find((v) => v.sku === item.sku);

      if (!product) {
        product = products.find((p) => p.variantes?.some((v) => v.sku === item.sku));
        variant = product?.variantes?.find((v) => v.sku === item.sku);
      }
      if (!product) continue;

      const precioMayor = variant?.precioMayorUsd ?? product.precioMayorUsd ?? 0;
      const precioGranMayor = variant?.precioGranMayorUsd ?? product.precioGranMayorUsd ?? 0;
      const minMayor = variant?.minMayor || product.minMayor || 50;
      const minGranMayor = variant?.minGranMayor || product.minGranMayor || 100;
      const stock = variant?.stock ?? product.stock ?? 0;

      // Gran Mayor se aplica cuando la cantidad llega al mínimo establecido
      const aplicaGranMayor =
        precioGranMayor > 0 && minGranMayor > 0 && item.cantidad >= minGranMayor;

      // El precio es por paquete: Mayor = minMayor unidades, Gran Mayor = minGranMayor unidades
      const unidadesPorPaquete = aplicaGranMayor ? minGranMayor : minMayor;
      const precioPaquete = aplicaGranMayor ? precioGranMayor : precioMayor;
      const subtotal =
        Math.round(precioPaquete * (item.cantidad / unidadesPorPaquete) * 100) / 100;

      const presentacion = variant?.presentacion ?? product.presentacion ?? '';
      const color = variant?.color ?? '';

      result.push({
        sku: item.sku,
        nombre: product.nombre,
        presentacion: [color, presentacion].filter(Boolean).join(' - '),
        foto: variant?.fotos?.[0]?.url || product.fotos?.[0]?.url || FALLBACK_IMAGE,
        cantidad: item.cantidad,
        step: minMayor,
        maxStock: stock > 0 ? stock : 999999,
        precioPaquete,
        unidadesPorPaquete,
        subtotal,
        nivel: aplicaGranMayor ? 'gran_mayor' : 'mayor',
      });
    }
    return result;
  }, [items, products]);

  const totalUsd = Math.round(lines.reduce((acc, l) => acc + l.subtotal, 0) * 100) / 100;
  const totalVes = totalUsd * (bcvRate || 0);

  // Auto-guardado en segundo plano de carrito para recuperación de abandonados
  useEffect(() => {
    if (!sessionId || lines.length === 0) return;
    if (!telefono.trim() && !nombre.trim()) return;

    const timer = setTimeout(() => {
      fetch('/api/cart/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          nombre,
          telefono,
          zonaEntrega,
          direccion,
          metodoPago,
          items: lines.map((l) => ({
            sku: l.sku,
            nombre: l.nombre,
            presentacion: l.presentacion,
            cantidad: l.cantidad,
            subtotal: l.subtotal,
            nivel: l.nivel,
          })),
          totalUsd,
        }),
      }).catch((e) => console.error('Error auto-guardando carrito:', e));
    }, 1200);

    return () => clearTimeout(timer);
  }, [sessionId, nombre, telefono, zonaEntrega, direccion, metodoPago, lines, totalUsd]);

  const handleGetLocation = () => {
    setGpsError('');

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Tu navegador o dispositivo no tiene activada la función de geolocalización.');
      setShowManualMapsInput(true);
      return;
    }

    if (window.isSecureContext === false) {
      setGpsError('La geolocalización requiere una conexión segura (HTTPS). Puedes ingresar tu enlace de Google Maps abajo.');
      setShowManualMapsInput(true);
      return;
    }

    setGpsLoading(true);

    const onSuccess = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setGpsLocation({ lat, lng });
      setCustomMapsUrl(`https://maps.google.com/?q=${lat},${lng}`);
      setGpsLoading(false);
      setGpsError('');
    };

    const onStandardAccuracyFallback = () => {
      // Intento 2: Precisión estándar (red WiFi/móvil) con margen de tiempo generoso
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (error) => {
          setGpsLoading(false);
          let message = 'No se pudo obtener la ubicación GPS.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Permiso denegado. Para compartir tu ubicación, activa los permisos de ubicación para este sitio en tu navegador o ajustes del teléfono.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Señal de ubicación no disponible en tu dispositivo. Puedes pegar un enlace de Google Maps o WhatsApp abajo.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Tiempo de espera agotado al conectar con el GPS de tu equipo. Puedes reintentar o ingresar tu enlace de Google Maps.';
          }
          setGpsError(message);
          setShowManualMapsInput(true);
        },
        {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 60000,
        }
      );
    };

    // Intento 1: Alta precisión con timeout de 6 segundos
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        // Si alta precisión falla o tarda, pasar de inmediato a precisión estándar
        onStandardAccuracyFallback();
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 0,
      }
    );
  };

  const handleClearLocation = () => {
    setGpsLocation(null);
    setCustomMapsUrl('');
    setGpsError('');
  };

  const handleSendOrder = () => {
    if (!nombre.trim() || !telefono.trim() || !zonaEntrega || !direccion.trim() || !metodoPago) {
      setErrorValidacion(
        'Por favor completa todos los campos obligatorios (*): Nombre, Teléfono, Zona de Entrega, Dirección y Método de Pago.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrorValidacion('');

    let message = `🛒 *NUEVO PEDIDO MAYORISTA - SUMILISTO*\n\n`;
    message += `👤 *Cliente:* ${nombre.trim()}\n`;
    message += `📞 *Teléfono:* ${telefono.trim()}\n`;
    message += `📍 *Zona de Entrega:* ${zonaEntrega}\n`;
    message += `🏠 *Dirección:* ${direccion.trim()}\n`;

    const mapsLink = gpsLocation
      ? `https://maps.google.com/?q=${gpsLocation.lat},${gpsLocation.lng}`
      : customMapsUrl.trim() || null;

    if (mapsLink) {
      message += `🗺️ *Ubicación GPS:* ${mapsLink}\n`;
    }
    message += `💳 *Método de Pago:* ${metodoPago}\n`;
    if (notas) message += `📝 *Notas:* ${notas}\n`;

    message += `\n📦 *DETALLE DEL PEDIDO:*\n`;
    lines.forEach((l, index) => {
      const detalle = l.presentacion ? ` (${l.presentacion})` : '';
      const tarifa = l.nivel === 'gran_mayor' ? 'Gran Mayor' : 'Mayor';
      message += `${index + 1}. ${l.nombre}${detalle} - ${l.cantidad} unds (${tarifa}) = ${formatUsd(
        l.subtotal
      )}\n`;
    });

    message += `\n💰 *TOTAL USD:* ${formatUsd(totalUsd)}`;
    if (bcvRate) {
      message += `\n💵 *TOTAL VES (BCV):* Bs. ${totalVes.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    const whatsappNumber = theme.whatsappNumber;
    if (!whatsappNumber) {
      setErrorValidacion('El número de WhatsApp de la tienda no está configurado. Intenta más tarde.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    // Marcar como completado en segundo plano
    if (sessionId) {
      fetch('/api/cart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }

    window.open(whatsappUrl, '_blank');
    markAsSentWhatsApp();
  };

  if (lines.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tu carrito está vacío</h2>
        <p className="text-slate-500 mb-6">Aún no has agregado productos mayoristas a tu pedido.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-[#20bd5a] transition-all"
        >
          <ArrowLeft className="w-5 h-5" /> Volver a la tienda
        </Link>
      </div>
    );
  }

  const inputClass =
    'w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Resumen de tu Pedido Mayorista</h1>

      {errorValidacion && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium animate-pulse">
          ⚠️ {errorValidacion}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTA DE PRODUCTOS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <span className="font-bold text-slate-700">
              Artículos en el pedido ({lines.length})
            </span>
            <button
              type="button"
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Vaciar pedido
            </button>
          </div>

          {lines.map((l) => (
            <div
              key={l.sku}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative w-20 h-20 flex-shrink-0 rounded-xl border border-slate-100 overflow-hidden bg-slate-50">
                  <Image
                    src={l.foto}
                    alt={l.nombre}
                    fill
                    unoptimized={true}
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">{l.nombre}</h3>
                  {l.presentacion && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-medium">
                      {l.presentacion}
                    </span>
                  )}
                  <p className="text-slate-500 text-sm mt-1">
                    {formatUsd(l.precioPaquete)} por {l.unidadesPorPaquete} unds
                  </p>
                  {l.nivel === 'gran_mayor' && (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded inline-block mt-1">
                      Precio Gran Mayor aplicado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                  <button
                    type="button"
                    onClick={() => updateQuantity(l.sku, l.cantidad - l.step)}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-l-xl transition-colors"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-bold text-slate-800 text-sm min-w-[4.5rem] text-center">
                    {l.cantidad}{' '}
                    <span className="text-[10px] font-normal text-slate-500">unds</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (l.cantidad + l.step > l.maxStock) return;
                      updateQuantity(l.sku, l.cantidad + l.step);
                    }}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-r-xl transition-colors"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="font-extrabold text-slate-900">{formatUsd(l.subtotal)}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(l.sku)}
                    className="text-red-500 hover:text-red-700 text-xs mt-1 flex items-center gap-0.5 ml-auto"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <Link
              href="/"
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm inline-flex items-center gap-1"
            >
              ← Seguir agregando productos
            </Link>
          </div>
        </div>

        {/* FORMULARIO DE DESPACHO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit space-y-5">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
            📍 DATOS PARA EL DESPACHO
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre o Empresa / Restaurante <span className="text-red-600 font-bold">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Hamburguesería Caracas / Juan Pérez"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Número de Teléfono <span className="text-red-600 font-bold">*</span>
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 0412-1234567"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Zona de Entrega <span className="text-red-600 font-bold">*</span>
            </label>
            <select
              value={zonaEntrega}
              onChange={(e) => setZonaEntrega(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Selecciona una zona...</option>
              <option value="Caracas">Caracas</option>
              <option value="Guarenas">Guarenas</option>
              <option value="Guatire">Guatire</option>
              <option value="Envío Nacional">Envío Nacional</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dirección Escrita / Referencia <span className="text-red-600 font-bold">*</span>
            </label>
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              rows={2}
              placeholder="Calle, edificio, local o punto de referencia exacto"
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          {zonaEntrega && zonaEntrega !== 'Envío Nacional' && (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  Ubicación GPS para el Delivery (Opcional)
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  Para el motorizado
                </span>
              </div>

              {!gpsLocation && !customMapsUrl ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gpsLoading}
                    className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 disabled:opacity-60"
                  >
                    <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                    {gpsLoading ? 'Obteniendo señal GPS...' : 'Compartir ubicación GPS actual'}
                  </button>

                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowManualMapsInput(!showManualMapsInput)}
                      className="text-[11px] font-semibold text-emerald-800 underline hover:text-emerald-950 transition-colors"
                    >
                      {showManualMapsInput ? 'Ocultar opción manual' : '¿O pegar enlace de Google Maps / WhatsApp?'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-850 flex items-center gap-1.5 text-emerald-900">
                      <Check className="w-4 h-4 text-emerald-600" /> Ubicación Lista para el Despacho
                    </span>
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors"
                    >
                      Quitar
                    </button>
                  </div>

                  {gpsLocation && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      📍 Lat: {gpsLocation.lat.toFixed(5)}, Lng: {gpsLocation.lng.toFixed(5)}
                    </p>
                  )}

                  <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                    <a
                      href={
                        gpsLocation
                          ? `https://maps.google.com/?q=${gpsLocation.lat},${gpsLocation.lng}`
                          : customMapsUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Verificar en Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={gpsLoading}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline ml-auto"
                    >
                      {gpsLoading ? 'Actualizando...' : 'Actualizar GPS'}
                    </button>
                  </div>
                </div>
              )}

              {/* Input manual de enlace de Google Maps */}
              {showManualMapsInput && !gpsLocation && (
                <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Pega aquí el enlace de Google Maps o pin compartido:
                  </label>
                  <input
                    type="url"
                    value={customMapsUrl}
                    onChange={(e) => setCustomMapsUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/... o https://maps.google.com/?q=..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[10px] text-slate-500">
                    Abre Google Maps en tu móvil o PC, mantén presionado el punto de tu local y dale &quot;Compartir enlace&quot;.
                  </p>
                </div>
              )}

              {/* Mensaje de ayuda si el dispositivo o navegador presenta dificultad con GPS */}
              {gpsError && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span>{gpsError}</span>
                    <p className="text-[10px] text-amber-800">
                      💡 <strong>Tip:</strong> Si estás en el teléfono, asegúrate de tener la Ubicación (GPS) encendida en los ajustes de tu celular y pulsar &quot;Permitir&quot; cuando el navegador te lo pregunte.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Método de Pago <span className="text-red-600 font-bold">*</span>
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona método de pago...</option>
              <option value="Pago Móvil / Transferencia Bs (Tasa BCV)">
                Pago Móvil / Transferencia Bs (Tasa BCV)
              </option>
              <option value="Dólares en Efectivo">Dólares en Efectivo</option>
              <option value="Binance USDT">Binance USDT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notas u Observaciones</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones especiales para el pedido"
              className={inputClass}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between items-center text-slate-600 text-sm">
              <span>Total en Dólares:</span>
              <span className="font-extrabold text-slate-900 text-lg">{formatUsd(totalUsd)}</span>
            </div>
            {bcvRate > 0 && (
              <div className="flex justify-between items-center text-slate-600 text-sm">
                <span>Ref. Bolívares (BCV):</span>
                <span className="font-bold text-slate-700">
                  Bs.{' '}
                  {totalVes.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSendOrder}
            className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar Pedido por WhatsApp
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-tight">
            Al enviar tu pedido, nuestro asesor confirmará existencias y coordinará el despacho contigo
            inmediatamente.
          </p>
        </div>
      </div>
    </div>
  );
}