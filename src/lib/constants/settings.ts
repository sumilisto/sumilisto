export interface HeroSlide {
  imageUrl: string;
  linkUrl?: string;
}

export interface StoreSettings {
  // Colores
  brandColor: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  cardBgColor: string;
  navBgColor: string;
  // Tipografía
  fontScale: "sm" | "base" | "lg";
  // Logo y WhatsApp
  logoUrl: string | null;
  whatsappNumber: string;
  // Hero section
  heroTitle: string;
  heroSubtitle: string;
  heroHeight: "sm" | "md" | "lg" | "xl";
  heroSlides: HeroSlide[];
  // Despachos
  despachoText: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  brandColor: "#590317",
  bgColor: "#f8fafc",
  textColor: "#0f172a",
  accentColor: "#d97706",
  cardBgColor: "#ffffff",
  navBgColor: "#590317",
  fontScale: "base",
  logoUrl: null,
  whatsappNumber: "584227894547",
  heroTitle: "Suministros y Empaques al Mayor para tu Restaurante",
  heroSubtitle: "Envases térmicos, bolsas kraft, cubiertos y papel antigrasa con escala de descuento al Gran Mayor. Despachos rápidos en Caracas, Guarenas y Guatire.",
  heroHeight: "md",
  heroSlides: [],
  despachoText: "Despachos en Caracas, Guarenas y Guatire",
};
