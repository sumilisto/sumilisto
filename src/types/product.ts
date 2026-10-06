export type ProductCategory = "Envases" | "Bolsas" | "Cubiertos" | "Papel" | string;

export type ProductStockStatus = "disponible" | "ultimas_unidades" | "agotado" | "no_disponible";

export interface ProductPhoto {
  url: string;
  publicId?: string;
  alt: string;
  isPrimary?: boolean;
}

export interface Product {
  sku: string;
  nombre: string;
  slug: string;
  categoria: ProductCategory;
  subcategoria?: string;
  marca?: string;
  presentacion: string;           // Ej: "Bulto de 1000 u.", "Caja de 500 u."
  unidadVenta: string;            // Ej: "Bulto", "Caja", "Paquete"
  precioMayorUsd?: number;        // Precio base al mayor en USD
  minMayor: number;               // Cantidad mínima para compra al mayor (def: 1)
  precioGranMayorUsd?: number;    // Precio con descuento por volumen
  minGranMayor?: number;          // Cantidad mínima para gran mayor
  stock: number;
  activo: boolean;
  destacado?: boolean;
  etiquetas?: string[];
  fotos: ProductPhoto[];
  descripcionLarga?: string;
  // Campos calculados para UI
  status: ProductStockStatus;
  isAvailable: boolean;           // False si no tiene precio o stock <= 0
}

export interface ProductFilterOptions {
  categoria?: string;
  subcategoria?: string;
  busqueda?: string;
  soloDestacados?: boolean;
}
