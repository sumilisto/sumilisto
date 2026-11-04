export type GrillaCanal = "instagram" | "mercadolibre" | "facebook";

export interface GrillaItem {
  id: string;
  canal: GrillaCanal;
  slotNumber: number; // 1..6 para IG, 1..2 para ML, 1..2 para FB
  tipo: string; // Formato: Historia, Reel, Post Feed, ML Listing, FB Marketplace
  hora: string; // Hora programada o de publicación (ej: "08:00 AM")
  productoId?: string;
  productoNombre?: string;
  productoImagen?: string;
  productoCategoria?: string;
  titulo?: string;
  completada: boolean;
  completadaAt?: string;
  notas?: string;
}

export interface GrillaDia {
  fecha: string; // YYYY-MM-DD
  items: GrillaItem[];
  notasGenerales?: string;
  updatedAt?: string;
}

export interface GrillaStats {
  totalCompletadasGlobal: number;
  diasConActividad: number;
  rachaActualDias: number;
}
