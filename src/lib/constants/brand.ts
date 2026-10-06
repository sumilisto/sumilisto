import { CategoryInfo, StoreConfig } from "@/types/store";

export const BRAND_COLORS = {
  primary: "#590317",
  primaryHover: "#73041e",
  primaryLight: "#fdf2f4",
  accent: "#d97706",
  white: "#ffffff",
  surface: "#ffffff",
  background: "#f8fafc",
  textMain: "#0f172a",
  textMuted: "#64748b",
} as const;

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: "Sumilisto",
  whatsappNumber: "584227894547",
  whatsappLastModifiedAt: new Date().toISOString(),
  deliveryZones: ["Caracas", "Guarenas", "Guatire", "Envíos Nacionales (a convenir)"],
  schedule: "Lunes a Viernes de 8:00 AM a 5:00 PM · Sábados de 8:00 AM a 1:00 PM",
  minOrderUsd: 10.00,
  lowStockThreshold: 10,
  showExactStock: false,
  paymentMethods: [
    "Pago Móvil / Transferencia Bancaria (Banesco / Mercantil)",
    "Dólares en Efectivo (Contra entrega o retiro)",
    "Binance Pay (USDT)",
    "Zelle (Previa confirmación)",
  ],
};

export const STORE_CATEGORIES: CategoryInfo[] = [
  {
    id: "envases",
    nombre: "Envases",
    slug: "envases",
    icono: "Package",
    descripcion: "Contenedores térmicos, bandejas de aluminio, envases herméticos, salseros y potes PET.",
  },
  {
    id: "bolsas",
    nombre: "Bolsas",
    slug: "bolsas",
    icono: "ShoppingBag",
    descripcion: "Bolsas kraft con y sin asa para delivery, bolsas plásticas tipo camiseta y polietileno.",
  },
  {
    id: "cubiertos",
    nombre: "Cubiertos",
    slug: "cubiertos",
    icono: "Utensils",
    descripcion: "Kits individuales con servilleta, cubiertos plásticos reforzados y ecológicos de madera.",
  },
  {
    id: "papel",
    nombre: "Papel",
    slug: "papel",
    icono: "Scroll",
    descripcion: "Papel parafinado antigrasa para hamburguesas, servilletas dispensador, film y aluminio.",
  },
];
