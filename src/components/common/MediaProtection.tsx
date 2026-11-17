"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * MediaProtection
 * - Deshabilita el menú contextual (clic derecho) exclusivamente en imágenes, videos y galerías multimedia.
 * - Deshabilita el arrastre de fotos fuera del navegador hacia el escritorio.
 * - Respeta al cliente legítimo: NO bloquea copiar texto normal (precios, descripciones, teléfonos, etc.).
 * - Se desactiva automáticamente en el panel administrativo (/admin) para no entorpecer la carga y edición de fotos.
 */
export function MediaProtection() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;

    // 1. Bloquear menú contextual (clic derecho) en fotos y medios protegidos
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isProtectedElement =
        target.tagName === "IMG" ||
        target.tagName === "PICTURE" ||
        target.tagName === "VIDEO" ||
        target.closest("img") !== null ||
        target.closest("picture") !== null ||
        target.closest("[data-protected-media]") !== null ||
        target.closest(".product-photo") !== null;

      if (isProtectedElement) {
        e.preventDefault();
      }
    };

    // 2. Bloquear arrastre de imágenes hacia el escritorio o pestañas
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        target.tagName === "IMG" ||
        target.tagName === "PICTURE" ||
        target.tagName === "VIDEO" ||
        target.closest("img") !== null ||
        target.closest("[data-protected-media]") !== null
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    document.addEventListener("dragstart", handleDragStart, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("dragstart", handleDragStart, { capture: true });
    };
  }, [isAdmin]);

  return null;
}
