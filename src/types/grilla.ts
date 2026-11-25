export type GrillaCanal = "instagram" | "mercadolibre" | "facebook";
export type FormatoContenido = "publicacion" | "historia";

export interface OpcionSimple {
  conceptoVisual: string;      // Qué foto tomar o mostrar
  titularImagen: string;       // Texto o titular superpuesto en la imagen
  composicion: string;         // Elementos en la gráfica (badges, logo, precio)
}

export interface OpcionCarrusel {
  tituloCarrusel: string;      // Tema general del carrusel
  laminas: Array<{
    numero: number;
    titulo: string;
    contenido: string;
    indicacionVisual: string;
  }>;
}

export interface OpcionReels {
  hook0a3s: string;            // Visual + Texto en pantalla + Audio inicial
  desarrolloAccion: string;    // Tomas, diálogo, edición dinámica (1.5s por toma)
  ctaFinal: string;            // Llamada a la acción ganadora
}

export interface NeuromarketingContent {
  hookViral: string;          // 0-3 segundos: Qué decir + Qué mostrar + Texto en pantalla
  problemaEnganche: string;   // Disparador psicológico / dolor / curiosidad universal
  desarrolloAccion: string;   // Tomas, diálogo, contexto real de uso, edición dinámica
  llamadaAccion: string;      // CTA ganador para seguidores + ventas
  copyCompleto: string;       // Texto listo para copiar con emojis, hashtags y formato
  formatoRecomendado?: string;// "Reel Dinámico", "Carrusel Educativo", "Historia Interactiva", "Publicación MercadoLibre", "Marketplace"
  tipoEnfoque?: string;       // "Desglose de Costo Real", "Prueba de Resistencia", "Valor Percibido", "ASMR / Almacén", "Mayor vs Gran Mayor", etc.
  mlTitulo?: string;          // Solo MercadoLibre: Título SEO optimizado (<60 caracteres)

  // Las 3 opciones de contenido para redes sociales
  opcionSimple?: OpcionSimple;
  opcionCarrusel?: OpcionCarrusel;
  opcionReels?: OpcionReels;
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
