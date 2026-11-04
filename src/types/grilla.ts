export type GrillaCanal = "instagram" | "mercadolibre" | "facebook";
export type FormatoContenido = "publicacion" | "historia";

export interface GrillaItem {
  id: string;
  canal: GrillaCanal;
  formatoTipo?: FormatoContenido; // "publicacion" (Feed/Reel/ML/Marketplace) | "historia" (Stories 24h)
  slotNumber: number;
  tipo: string;
  hora: string;
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
