"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapPin, X, Navigation, Check, Search, ArrowRight,
  Compass, AlertCircle, ExternalLink,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  initialZone?: string;
  onConfirm: (location: { lat: number; lng: number; addressHint?: string }) => void;
}

// Zonas predefinidas para navegación rápida
const ZONES = [
  { name: "Caracas", lat: 10.4880, lng: -66.8792, zoom: 14 },
  { name: "Guarenas", lat: 10.4631, lng: -66.6172, zoom: 15 },
  { name: "Guatire", lat: 10.4744, lng: -66.5442, zoom: 15 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialZone,
  onConfirm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Determinar punto de inicio por defecto
  const defaultZone = ZONES.find((z) => z.name.toLowerCase() === initialZone?.toLowerCase()) || ZONES[0];
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat || defaultZone.lat,
    lng: initialLng || defaultZone.lng,
  });

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Inicializar Leaflet map al abrir
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let map: any = null;

    // Cargar leaflet dinámicamente en el cliente
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Destruir mapa previo si existiera
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }

      const startLat = initialLat || defaultZone.lat;
      const startLng = initialLng || defaultZone.lng;
      const startZoom = initialLat ? 16 : defaultZone.zoom;

      map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: startZoom,
        zoomControl: false,
      });

      // Añadir capa de mapa OpenStreetMap limpia y moderna
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Botones de zoom en esquina inferior derecha
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Evento al mover el mapa (Pin en el centro)
      map.on("movestart", () => {
        setIsDragging(true);
      });

      map.on("move", () => {
        const center = map.getCenter();
        setCurrentCoords({ lat: center.lat, lng: center.lng });
      });

      map.on("moveend", () => {
        const center = map.getCenter();
        setCurrentCoords({ lat: center.lat, lng: center.lng });
        setIsDragging(false);
      });

      mapInstanceRef.current = map;
      setIsMapLoaded(true);

      // Asegurar redimensionamiento correcto al abrir el modal
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 200);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng, defaultZone]);

  // Manejo de "Mi Ubicación actual" (GPS)
  const handleUseMyLocation = () => {
    setGpsError("");

    if (!navigator.geolocation) {
      setGpsError("Tu navegador no soporta geolocalización. Mueve el mapa manualmente.");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setGpsError("La geolocalización requiere conexión segura HTTPS. Puedes mover el mapa manualmente.");
      return;
    }

    setIsGpsLoading(true);

    const onPosSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCurrentCoords({ lat, lng });
      setIsGpsLoading(false);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 17, {
          duration: 1.2,
        });
      }
    };

    const onError = (err: GeolocationPositionError) => {
      setIsGpsLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError(
          "Permiso de ubicación bloqueado. Toca el candado 🔒 en la barra de direcciones de tu navegador y activa 'Ubicación', o mueve el mapa manualmente."
        );
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setGpsError(
          "Señal GPS no disponible en este momento. Puedes arrastrar el mapa y colocar el pin manualmente."
        );
      } else if (err.code === err.TIMEOUT) {
        setGpsError("Tiempo agotado buscando señal GPS. Puedes arrastrar el mapa y fijar tu punto.");
      } else {
        setGpsError("No se pudo obtener la señal GPS. Puedes mover el mapa manualmente hasta tu dirección.");
      }
    };

    // Intento 1: Precisión estándar (rápida por Wi-Fi/celular/red)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPosSuccess(pos);
        // Intentar refinar con alta precisión satelital
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      },
      (fastErr) => {
        if (fastErr.code === fastErr.PERMISSION_DENIED) {
          onError(fastErr);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          onError,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Mover mapa a zona predefinida
  const handleJumpToZone = (zone: typeof ZONES[0]) => {
    setGpsError("");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([zone.lat, zone.lng], zone.zoom, {
        duration: 1.0,
      });
    }
  };

  const handleConfirm = () => {
    onConfirm(currentCoords);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[90vh] max-h-[720px]">
        {/* Cabecera del modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-20">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Selecciona tu ubicación en el mapa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mueve el mapa hasta colocar el pin sobre la entrada de tu local o casa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Zonas Rápidas (Caracas, Guarenas, Guatire) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none z-20">
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase">
            Saltar a:
          </span>
          {ZONES.map((zone) => (
            <button
              key={zone.name}
              type="button"
              onClick={() => handleJumpToZone(zone)}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all whitespace-nowrap shadow-2xs"
            >
              📍 {zone.name}
            </button>
          ))}
        </div>

        {/* Contenedor del Mapa Interactivo con PIN central */}
        <div className="relative flex-1 w-full bg-slate-100 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* PIN Central Flotante con animación de elevación al arrastrar */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10 flex flex-col items-center">
            {/* Indicador con etiqueta */}
            <div
              className={`mb-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold shadow-md whitespace-nowrap transition-transform duration-150 ${
                isDragging ? "scale-110 -translate-y-2 opacity-95" : "scale-100 opacity-100"
              }`}
            >
              {isDragging ? "Soltar para fijar punto" : "Entregar aquí"}
            </div>

            {/* Ícono de Pin interactivo */}
            <div
              className={`transition-transform duration-150 ${
                isDragging ? "-translate-y-3 scale-110" : "translate-y-0 scale-100"
              }`}
            >
              <svg width="40" height="48" viewBox="0 0 24 30" fill="none" className="drop-shadow-lg">
                <path
                  d="M12 0C5.37258 0 0 5.37258 0 12C0 18.5 12 30 12 30C12 30 24 18.5 24 12C24 5.37258 18.6274 0 12 0Z"
                  fill="#059669"
                />
                <circle cx="12" cy="11" r="5" fill="#ffffff" />
                <circle cx="12" cy="11" r="2.5" fill="#047857" />
              </svg>
            </div>

            {/* Sombra de suelo del Pin */}
            <div
              className={`w-3 h-1.5 bg-black/30 rounded-full blur-[1px] transition-all duration-150 ${
                isDragging ? "scale-75 opacity-20" : "scale-100 opacity-50"
              }`}
            />
          </div>

          {/* Botón flotante: Usar mi ubicación GPS */}
          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isGpsLoading}
              className="px-3.5 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-md border border-slate-200/80 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all backdrop-blur-xs disabled:opacity-50"
            >
              <Navigation
                className={`w-4 h-4 text-emerald-600 ${isGpsLoading ? "animate-spin" : ""}`}
              />
              <span>{isGpsLoading ? "Buscando GPS..." : "Mi ubicación actual"}</span>
            </button>
          </div>

          {/* Alerta si falla GPS (discreta en la parte superior) */}
          {gpsError && (
            <div className="absolute top-16 left-4 right-4 z-10 p-2.5 rounded-xl bg-amber-500/95 text-white text-xs font-semibold shadow-md flex items-center justify-between gap-2 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{gpsError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGpsError("")}
                className="p-1 hover:bg-black/10 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Barra inferior de confirmación */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 space-y-3 z-20">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>
              Coordenadas: <strong>{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</strong>
            </span>
            <span className="text-[11px] font-sans font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              ✓ Punto fijado
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 h-11 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar esta ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
