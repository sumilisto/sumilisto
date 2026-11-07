export interface OrderItem {
  sku: string;
  nombre: string;
  presentacion?: string;
  color?: string;
  cantidad: number;
  precioUnitarioUsd: number;
  costoUnitarioUsd?: number;
  subtotalUsd: number;
  tarifa: "mayor" | "gran_mayor";
}

export type OrderStatus = "pendiente" | "pagado" | "despachado" | "entregado" | "cancelado";
export type OrderSource = "web" | "manual";

export interface Order {
  id: string;
  codigo: string; // #SUMI-5978 (4 dígitos no correlativos)
  origen: OrderSource;
  clienteNombre: string;
  clienteTelefono: string;
  zonaEntrega: string;
  direccion: string;
  metodoPago: string;
  notas?: string;
  items: OrderItem[];
  totalUsd: number;
  totalVes: number;
  tasaBcv: number;
  // Costos operativos y variables:
  costoMercanciaUsd: number;
  gastoFleteRetiroUsd: number; // $5.00 o prorrateado si se agruparon pedidos del mismo día
  gastoEmbalajeUsd: number; // $0.50 por pedido
  gananciaBrutaUsd: number; // totalUsd - costoMercanciaUsd
  // Gestión Fiscal venezolana (Con IVA vs Sin IVA):
  conIva?: boolean; // false = Sin IVA / Nota de Entrega (100% de margen a ganancia), true = Con IVA (Factura fiscal 16% SENIAT)
  ivaMontoUsd?: number; // Débito fiscal / cuota SENIAT si conIva = true
  gananciaNetaUsd: number; // gananciaBrutaUsd - (conIva ? ivaMontoUsd : 0) - flete - embalaje
  // Distribución del 20% o utilidad neta:
  reparto: {
    reinversion: number; // 50%
    reserva: number; // 20%
    sueldo: number; // 20%
    ahorro: number; // 10%
  };
  estado: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingSettings {
  sueldoFijoMensual: number;
  internetMensual: number;
  luzMensual: number;
  dominioMensual: number;
  fleteRetiroBase: number;
  embalajePorPedido: number;
  margenMetaPorcentaje: number;
  distribucion: {
    reinversion: number;
    reserva: number;
    sueldo: number;
    ahorro: number;
  };
}

export const DEFAULT_ACCOUNTING_SETTINGS: AccountingSettings = {
  sueldoFijoMensual: 800.0,
  internetMensual: 25.0,
  luzMensual: 10.0,
  dominioMensual: 1.0, // $12 anual / 12 meses
  fleteRetiroBase: 5.0,
  embalajePorPedido: 0.5,
  margenMetaPorcentaje: 20.0,
  distribucion: {
    reinversion: 50,
    reserva: 20,
    sueldo: 20,
    ahorro: 10,
  },
};

