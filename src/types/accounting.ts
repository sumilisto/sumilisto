export type ExpenseCategory =
  | "meta_ads"
  | "inventario"
  | "flete"
  | "servicios"
  | "otros";

export type PaymentMethod =
  | "usdt"
  | "bs_pago_movil"
  | "bs_transferencia"
  | "usd_efectivo"
  | "otro";

export interface Expense {
  id: string;
  fecha: string; // YYYY-MM-DD
  categoria: ExpenseCategory;
  concepto: string;
  montoUsd: number;
  montoBs?: number;
  tasaCambio?: number;
  metodoPago: PaymentMethod;
  notas?: string;
  createdAt: string;
}

export type UsdtTxType = "compra" | "venta" | "pago_proveedor";

export interface UsdtTransaction {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: UsdtTxType;
  montoUsdt: number;
  tasaBsPorUsdt?: number;
  montoBs?: number;
  // Campos para pago a proveedor con descuento:
  proveedorNombre?: string;
  montoOriginalUsd?: number;
  descuentoPorcentaje?: number;
  ahorroUsd?: number;
  plataforma?: string; // Binance P2P, El Dorado, Efectivo, etc.
  referencia?: string;
  notas?: string;
  createdAt: string;
}

export interface UsdtRates {
  tasaCompraUsdt: number; // Bs por USDT que pagas al comprar
  tasaVentaUsdt: number;  // Bs por USDT que recibes al vender
  ultimaActualizacion?: string;
}

export const DEFAULT_USDT_RATES: UsdtRates = {
  tasaCompraUsdt: 935.0,
  tasaVentaUsdt: 925.0,
};
