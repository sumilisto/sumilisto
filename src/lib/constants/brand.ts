import { CategoryInfo, StoreConfig } from "@/types/store";

export const BRAND_COLORS = {
  primary: "#166534",
  primaryHover: "#14532D",
  primaryLight: "#f0fdf4",
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
    descripcion: "Envases, bandejas, contenedores térmicos y potes de alta resistencia al mayor.",
  },
  {
    id: "bolsas",
    nombre: "Bolsas",
    slug: "bolsas",
    icono: "ShoppingBag",
    descripcion: "Bolsas herméticas, pouches para café, bolsas kraft y empaques resistentes al mayor y gran mayor.",
  },
  {
    id: "cubiertos",
    nombre: "Cubiertos",
    slug: "cubiertos",
    icono: "Utensils",
    descripcion: "Cubiertos descartables, kits individuales y artículos para eventos y comercios al mayor.",
  },
  {
    id: "papel",
    nombre: "Papel",
    slug: "papel",
    icono: "Scroll",
    descripcion: "Papel antigrasa, servilletas, rollos de aluminio y películas plásticas al mayor.",
  },
];
