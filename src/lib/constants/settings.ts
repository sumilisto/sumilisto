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
  // Footer
  footerDescription: string;
  footerSchedule: string;
  footerDeliveryText: string;
  footerBgColor: string;
  footerTextColor: string;
  // Color Suave / Fondo secundario (para fondos de selección, banners secundarios, modales)
  softBgColor: string;
  // Color de texto en barra superior / banners
  topBarTextColor: string;
  // Barra Inferior Móvil (etiquetas y colores)
  bottomNavBgColor: string;
  bottomNavTextColor: string;
  bottomNavActiveColor: string;
  navLabelInicio: string;
  navLabelCategorias: string;
  navLabelCarrito: string;
  navLabelBuscar: string;
  navLabelDespachos: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  brandColor: "#166534",
  bgColor: "#f8fafc",
  textColor: "#0f172a",
  accentColor: "#d97706",
  cardBgColor: "#ffffff",
  navBgColor: "#14532D",
  softBgColor: "#f0fdf4",
  topBarTextColor: "#f0fdf4",
  fontScale: "base",
  logoUrl: null,
  whatsappNumber: "584227864547",
  heroTitle: "Suministros y Empaques al Mayor para tu Restaurante",
  heroSubtitle: "Envases térmicos, bolsas kraft, cubiertos y papel antigrasa con escala de descuento al Gran Mayor. Despachos rápidos en Caracas, Guarenas y Guatire.",
  heroHeight: "md",
  heroSlides: [],
  despachoText: "Despachos en Caracas, Guarenas y Guatire",
  // Footer
  footerDescription: "Tu aliado confiable en suministros y empaques al Mayor y Gran Mayor para restaurantes, cadenas de comida rápida y servicios de alimentos en Venezuela.",
  footerSchedule: "Lunes a Viernes: 8:00 AM - 5:00 PM",
  footerDeliveryText: "Despachos en Caracas, Guarenas y Guatire. Envíos nacionales por encomienda.",
  footerBgColor: "#0f172a",
  footerTextColor: "#94a3b8",
  // Barra Inferior Móvil
  bottomNavBgColor: "#ffffff",
  bottomNavTextColor: "#475569",
  bottomNavActiveColor: "#166534",
  navLabelInicio: "Inicio",
  navLabelCategorias: "Categorías",
  navLabelCarrito: "Carrito",
  navLabelBuscar: "Buscar",
  navLabelDespachos: "Despachos",
};
