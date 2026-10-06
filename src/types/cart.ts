export type CartStatus = "activo" | "enviado_whatsapp";

export interface CartStorageItem {
  sku: string;
  cantidad: number;
}

export interface CartStorageData {
  items: CartStorageItem[];
  updatedAt: number;              // Timestamp epoch ms de última modificación
  whatsappSentAt?: number;        // Timestamp epoch ms si ya fue enviado
  status: CartStatus;
}

export interface CartLineItem {
  sku: string;
  nombre: string;
  presentacion: string;
  unidadVenta: string;
  fotoUrl: string;
  cantidad: number;
  precioUnitarioUsd: number;
  subtotalUsd: number;
  nivelAplicado: "mayor" | "gran_mayor";
  ahorroSiguienteNivel?: {
    unidadesFaltantes: number;
    precioSiguienteUsd: number;
    mensaje: string;
  };
  stockDisponible: number;
  sinStockSuficiente?: boolean;
}

export interface CartSummary {
  items: CartLineItem[];
  subtotalUsd: number;
  totalUsd: number;
  totalVes: number;
  tasaBcv: number;
  fechaTasa: string;
  codigoPedido: string;           // Formato SUM-AAMMDD-XXXX
  whatsappUrl?: string;
  whatsappMessage?: string;
}

export interface CustomerOrderForm {
  nombre: string;
  modalidad: "entrega" | "retiro";
  zonaEntrega: string;
  metodoPago: string;
  notas?: string;
}
