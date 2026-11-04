import { GrillaItem } from "@/types/grilla";

/**
 * Grilla Diaria Maestra organizada en Orden Cronológico Óptimo
 * basado en los picos de tráfico comercial y B2B en Venezuela (UTC-4):
 * - 6 publicaciones en Instagram (Historias, Reel, Feed)
 * - 2 publicaciones en MercadoLibre (Producto Estrella y Combos)
 * - 2 publicaciones en Facebook Marketplace (Caracas y Guarenas-Guatire)
 */
export function getDefaultGrillaItems(fecha: string): GrillaItem[] {
  return [
    {
      id: `${fecha}-slot-1`,
      canal: "instagram",
      slotNumber: 1,
      tipo: "Historia: Apertura & Producto Estrella",
      hora: "08:00 AM",
      titulo: "Producto del Día con Descuento",
      completada: false,
    },
    {
      id: `${fecha}-slot-2`,
      canal: "facebook",
      slotNumber: 1,
      tipo: "Marketplace: Zona Caracas",
      hora: "09:00 AM",
      titulo: "Publicación Marketplace Caracas",
      completada: false,
    },
    {
      id: `${fecha}-slot-3`,
      canal: "mercadolibre",
      slotNumber: 1,
      tipo: "Publicación ML: Producto Estrella",
      hora: "10:00 AM",
      titulo: "Publicación ML Nueva o Reactivación",
      completada: false,
    },
    {
      id: `${fecha}-slot-4`,
      canal: "instagram",
      slotNumber: 2,
      tipo: "Historia: Escala Mayor / Gran Mayor",
      hora: "11:30 AM",
      titulo: "Precios y Descuentos por Bulto",
      completada: false,
    },
    {
      id: `${fecha}-slot-5`,
      canal: "instagram",
      slotNumber: 3,
      tipo: "Reel / Video: Demostración de Resistencia",
      hora: "01:30 PM",
      titulo: "Reel Demostrativo de Calidad",
      completada: false,
    },
    {
      id: `${fecha}-slot-6`,
      canal: "facebook",
      slotNumber: 2,
      tipo: "Marketplace: Zona Guarenas - Guatire",
      hora: "03:00 PM",
      titulo: "Publicación Marketplace Guarenas-Guatire",
      completada: false,
    },
    {
      id: `${fecha}-slot-7`,
      canal: "mercadolibre",
      slotNumber: 2,
      tipo: "Publicación ML: Combo o Gran Mayor",
      hora: "04:00 PM",
      titulo: "Publicación ML Combo / Descartables",
      completada: false,
    },
    {
      id: `${fecha}-slot-8`,
      canal: "instagram",
      slotNumber: 4,
      tipo: "Post Feed: Ficha de Producto y Medidas",
      hora: "05:30 PM",
      titulo: "Post en Cuadrícula / Carrusel",
      completada: false,
    },
    {
      id: `${fecha}-slot-9`,
      canal: "instagram",
      slotNumber: 5,
      tipo: "Historia: Zonas de Despacho y Rutas",
      hora: "07:00 PM",
      titulo: "Rutas de Entrega Activas",
      completada: false,
    },
    {
      id: `${fecha}-slot-10`,
      canal: "instagram",
      slotNumber: 6,
      tipo: "Historia: Reseñas, Métodos de Pago y Cierre",
      hora: "08:30 PM",
      titulo: "Prueba Social y Pagos en Bs/Divisas",
      completada: false,
    },
  ];
}
