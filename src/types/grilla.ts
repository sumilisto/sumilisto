export type GrillaCanal = "instagram" | "mercadolibre" | "facebook";

export interface GrillaItem {
  id: string;
  canal: GrillaCanal;
  slotNumber: number; // 1..6 for IG, 1..2 for ML, 1..2 for FB
  tipo: string;
  horarioSugerido: string;
  productoId?: string;
  productoNombre?: string;
  productoImagen?: string;
  titulo: string;
  copia: string;
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
