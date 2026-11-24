export type GrillaCanal = "instagram" | "mercadolibre" | "facebook";
export type FormatoContenido = "publicacion" | "historia";

export interface NeuromarketingContent {
  hookViral: string;          // 0-3 segundos: Qué decir + Qué mostrar + Texto en pantalla
  problemaEnganche: string;   // Disparador psicológico / dolor / curiosidad universal
  desarrolloAccion: string;   // Tomas, diálogo, contexto real de uso, edición dinámica
  llamadaAccion: string;      // CTA ganador para seguidores + ventas
  copyCompleto: string;       // Texto listo para copiar con emojis, hashtags y formato
  formatoRecomendado?: string;// "Reel Dinámico", "Carrusel Educativo", "Historia Interactiva", "Publicación MercadoLibre", "Marketplace"
  tipoEnfoque?: string;       // "Desglose de Costo Real", "Prueba de Resistencia", "Valor Percibido", "ASMR / Almacén", "Mayor vs Gran Mayor", etc.
  mlTitulo?: string;          // Solo MercadoLibre: Título SEO optimizado (<60 caracteres)
}

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
  contenido?: NeuromarketingContent;
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
