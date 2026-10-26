"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Generar o recuperar ID de sesión de visitante único
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let vid = localStorage.getItem("sumilisto_vid");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem("sumilisto_vid", vid);
    }
    return vid;
  } catch {
    return "v_anon_" + Math.random().toString(36).substring(2, 9);
  }
}

// Detectar tipo de dispositivo
function getDeviceType(): "Móvil" | "Tablet" | "Escritorio" {
  if (typeof window === "undefined") return "Escritorio";
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return "Móvil";
  }
  return "Escritorio";
}

// Detectar navegador
function getBrowserName(): string {
  if (typeof window === "undefined") return "Chrome";
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
  return "Navegador Web";
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // No rastrear navegación dentro del panel de administración ni APIs
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    // Comprobar si este dispositivo está excluido (dueño / administrador)
    try {
      const isExcluded =
        localStorage.getItem("sumilisto_exclude_analytics") === "true" ||
        localStorage.getItem("sumilisto_is_admin") === "true" ||
        document.cookie.includes("sumilisto_admin_session");
      if (isExcluded) {
        return;
      }
    } catch {}

    const fullPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    // Evitar duplicar el evento si la ruta es la misma consecutivamente
    if (lastTrackedPath.current === fullPath) {
      return;
    }
    lastTrackedPath.current = fullPath;

    // Identificar si está visitando un producto
    let productoSku: string | undefined = undefined;
    let productoNombre: string | undefined = undefined;

    if (pathname.startsWith("/producto/")) {
      const slug = pathname.replace("/producto/", "").split("/")[0];
      // Nombre legible a partir del slug
      productoNombre = decodeURIComponent(slug)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const payload = {
      ruta: pathname,
      productoSku,
      productoNombre,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      sessionId: getSessionId(),
      dispositivo: getDeviceType(),
      navegador: getBrowserName(),
    };

    // Envío asíncrono y no bloqueante
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/track", blob);
      } else {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignorar fallas silenciosamente para no interrumpir al usuario
    }
  }, [pathname, searchParams]);

  return null;
}
