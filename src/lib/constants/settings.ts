export interface HeroSlide {
  imageUrl: string;
  linkUrl?: string;
  buttonText?: string;
  title?: string;
  subtitle?: string;
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
  // Tipografía y Márgenes de Tarjetas de Producto
  cardCategoryFontSize?: string;
  cardTitleFontSize?: string;
  cardMayorFontSize?: string;
  cardGranMayorFontSize?: string;
  cardPaddingY?: string;
  cardPaddingX?: string;
  cardLineSpacing?: string;
  // Logo, WhatsApp e Instagram
  logoUrl: string | null;
  whatsappNumber: string;
  instagramHandle?: string;
  instagramUrl?: string;
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
  customCategories?: string[];
  deletedCategories?: string[];
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
  cardCategoryFontSize: "11px",
  cardTitleFontSize: "13px",
  cardMayorFontSize: "18px",
  cardGranMayorFontSize: "15px",
  cardPaddingY: "4px",
  cardPaddingX: "10px",
  cardLineSpacing: "3px",
  logoUrl: null,
  whatsappNumber: "584227864547",
  instagramHandle: "sumilisto_",
  instagramUrl: "https://www.instagram.com/sumilisto_/",
  heroTitle: "Suministros, Empaques y Descartables al Mayor y Gran Mayor para tu Negocio",
  heroSubtitle: "Empaques comerciales, bolsas kraft, vasos, cajas, descartables y artículos para eventos con escala de descuento al Gran Mayor. Despachos rápidos en Caracas, Guarenas, Guatire y envíos nacionales.",
  heroHeight: "md",
  heroSlides: [],
  despachoText: "Despachos en Caracas, Guarenas y Guatire",
  // Footer
  footerDescription: "Tu aliado confiable en suministros, empaques y descartables al Mayor y Gran Mayor para negocios, comercios, emprendimientos y eventos en Venezuela.",
  footerSchedule: "Lunes a Viernes: 8:00 AM - 5:00 PM\nSábados: 8:00 AM - 1:00 PM",
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
  customCategories: [],
  deletedCategories: [],
};
