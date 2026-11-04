import { GrillaItem } from "@/types/grilla";

/**
 * Grilla Diaria Maestra organizada en Orden Cronológico:
 * - 6 Publicaciones (2 Instagram Feed/Reel + 2 MercadoLibre + 2 FB Marketplace)
 * - 4 Historias (4 Instagram Stories espaciadas a lo largo del día)
 * Total: 10 contenidos diarios
 */
export function getDefaultGrillaItems(fecha: string): GrillaItem[] {
  return [
    {
      id: `${fecha}-slot-1`,
      canal: "instagram",
      formatoTipo: "historia",
      slotNumber: 1,
      tipo: "Historia 1: Apertura & Producto Estrella",
      hora: "08:00 AM",
      titulo: "Producto del Día con Descuento",
      completada: false,
    },
    {
      id: `${fecha}-slot-2`,
      canal: "facebook",
      formatoTipo: "publicacion",
      slotNumber: 1,
      tipo: "Publicación 1: Marketplace Caracas",
      hora: "09:00 AM",
      titulo: "Publicación Marketplace Caracas",
      completada: false,
    },
    {
      id: `${fecha}-slot-3`,
      canal: "mercadolibre",
      formatoTipo: "publicacion",
      slotNumber: 1,
      tipo: "Publicación 2: ML Producto Estrella",
      hora: "10:00 AM",
      titulo: "Publicación ML Nueva o Reactivación",
      completada: false,
    },
    {
      id: `${fecha}-slot-4`,
      canal: "instagram",
      formatoTipo: "historia",
      slotNumber: 2,
      tipo: "Historia 2: Escala Mayor / Gran Mayor",
      hora: "11:30 AM",
      titulo: "Precios y Descuentos por Bulto",
      completada: false,
    },
    {
      id: `${fecha}-slot-5`,
      canal: "instagram",
      formatoTipo: "publicacion",
      slotNumber: 3,
      tipo: "Publicación 3: Reel Demostrativo",
      hora: "01:30 PM",
      titulo: "Reel Demostrativo de Resistencia",
      completada: false,
    },
    {
      id: `${fecha}-slot-6`,
      canal: "facebook",
      formatoTipo: "publicacion",
      slotNumber: 2,
      tipo: "Publicación 4: Marketplace Guarenas-Guatire",
      hora: "03:00 PM",
      titulo: "Publicación Marketplace Miranda",
      completada: false,
    },
    {
      id: `${fecha}-slot-7`,
      canal: "mercadolibre",
      formatoTipo: "publicacion",
      slotNumber: 2,
      tipo: "Publicación 5: ML Combo o Gran Mayor",
      hora: "04:00 PM",
      titulo: "Publicación ML Combo / Descartables",
      completada: false,
    },
    {
      id: `${fecha}-slot-8`,
      canal: "instagram",
      formatoTipo: "publicacion",
      slotNumber: 4,
      tipo: "Publicación 6: Post Feed Catálogo",
      hora: "05:30 PM",
      titulo: "Post en Cuadrícula / Carrusel",
      completada: false,
    },
    {
      id: `${fecha}-slot-9`,
      canal: "instagram",
      formatoTipo: "historia",
      slotNumber: 5,
      tipo: "Historia 3: Zonas y Rutas de Despacho",
      hora: "07:00 PM",
      titulo: "Rutas de Entrega Activas",
      completada: false,
    },
    {
      id: `${fecha}-slot-10`,
      canal: "instagram",
      formatoTipo: "historia",
      slotNumber: 6,
      tipo: "Historia 4: Reseñas y Métodos de Pago",
      hora: "08:30 PM",
      titulo: "Prueba Social y Pagos en Bs/Divisas",
      completada: false,
    },
  ];
}
