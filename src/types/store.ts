export interface StoreConfig {
  storeName: string;
  whatsappNumber: string;
  whatsappLastModifiedAt: string;
  deliveryZones: string[];
  schedule: string;
  minOrderUsd: number;
  lowStockThreshold: number;
  showExactStock: boolean;
  paymentMethods: string[];
  metaPixelId?: string;
}

export interface CategoryInfo {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  descripcion: string;
  totalProductos?: number;
}
