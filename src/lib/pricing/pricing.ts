import { Product } from "@/types/product";

export interface PricingResult {
  unitPriceUsd: number;
  subtotalUsd: number;
  tier: "mayor" | "gran_mayor";
  savingsNextTier?: {
    unitsNeeded: number;
    priceNextTierUsd: number;
    savingsPerUnitUsd: number;
    message: string;
  };
  isAvailable: boolean;
  unavailabilityReason?: string;
}

/**
 * Motor de precios mayorista para Sumilisto
 * Reglas de negocio:
 * 1. La venta se realiza por lotes/paquetes de unidades mínimas (ej: 100 unidades).
 * 2. precioMayorUsd es el precio del paquete de minMayor (ej: $ 22,75 por 100 unidades).
 * 3. Si cantidad >= minGranMayor y existe precioGranMayorUsd, aplica tarifa Gran Mayor.
 */
export function calculateProductPrice(
  product: Pick<Product, "sku" | "precioMayorUsd" | "minMayor" | "precioGranMayorUsd" | "minGranMayor" | "stock" | "activo">,
  quantity: number
): PricingResult {
  if (!product.activo) {
    return {
      unitPriceUsd: 0,
      subtotalUsd: 0,
      tier: "mayor",
      isAvailable: false,
      unavailabilityReason: "Producto inactivo en catálogo",
    };
  }

  if (product.stock <= 0) {
    return {
      unitPriceUsd: 0,
      subtotalUsd: 0,
      tier: "mayor",
      isAvailable: false,
      unavailabilityReason: "Agotado",
    };
  }

  const basePrice = product.precioMayorUsd ?? 0;
  if (basePrice <= 0) {
    return {
      unitPriceUsd: 0,
      subtotalUsd: 0,
      tier: "mayor",
      isAvailable: false,
      unavailabilityReason: "NO DISPONIBLE (precio no definido)",
    };
  }

  const minMayor = Math.max(1, product.minMayor || 1);
  const granMayorPrice = product.precioGranMayorUsd ?? 0;
  const minGranMayor = product.minGranMayor ?? 0;

  const hasGranMayor = granMayorPrice > 0 && minGranMayor > minMayor;
  const qualifiesGranMayor = hasGranMayor && quantity >= minGranMayor;

  let unitPriceUsd = basePrice;
  let subtotalUsd = 0;
  let tier: "mayor" | "gran_mayor" = "mayor";

  if (qualifiesGranMayor) {
    tier = "gran_mayor";
    unitPriceUsd = granMayorPrice;
    // Si compra a Gran Mayor (ej: minGranMayor = 500, precio = $41.20)
    const factor = quantity / minGranMayor;
    subtotalUsd = Math.round(granMayorPrice * factor * 100) / 100;
  } else {
    tier = "mayor";
    unitPriceUsd = basePrice;
    // Precio base por lote de minMayor (ej: 100 unid = $22.75, 200 unid = $45.50)
    const factor = quantity / minMayor;
    subtotalUsd = Math.round(basePrice * factor * 100) / 100;
  }

  // Notificación de ahorro para el siguiente nivel
  let savingsNextTier: PricingResult["savingsNextTier"] = undefined;
  if (!qualifiesGranMayor && hasGranMayor) {
    const unitsNeeded = minGranMayor - quantity;
    if (unitsNeeded > 0) {
      savingsNextTier = {
        unitsNeeded,
        priceNextTierUsd: granMayorPrice,
        savingsPerUnitUsd: 0,
        message: `Llega a ${minGranMayor} unidades y paga tarifa Gran Mayor: $ ${granMayorPrice.toFixed(2).replace(".", ",")}`,
      };
    }
  }

  return {
    unitPriceUsd,
    subtotalUsd,
    tier,
    savingsNextTier,
    isAvailable: true,
  };
}

export interface WholesalePriceInput {
  minMayor?: number;
  precioMayorUsd?: number;
  costoMayorUsd?: number;
  minGranMayor?: number;
  precioGranMayorUsd?: number;
  costoGranMayorUsd?: number;
}

export interface WholesaleLineResult {
  tarifa: "mayor" | "gran_mayor";
  minMayor: number;
  minGranMayor: number;
  hasGranMayor: boolean;
  unidadesPorPaquete: number;
  precioMayor: number;
  precioGranMayor: number;
  precioPaquete: number;
  costoPaquete: number;
  subtotalUsd: number;
  costoTotalUsd: number;
}

/**
 * Resuelve la tarifa efectiva (Mayor vs Gran Mayor) y los montos de una línea de pedido
 * aplicando la escala mayorista de forma uniforme en admin, carrito y API.
 */
export function resolveWholesaleLine(
  product: WholesalePriceInput | null | undefined,
  variant: WholesalePriceInput | null | undefined,
  quantity: number
): WholesaleLineResult {
  const minMayor = Math.max(1, variant?.minMayor || product?.minMayor || 50);
  const minGranMayor = variant?.minGranMayor || product?.minGranMayor || 0;
  const precioMayor = variant?.precioMayorUsd || product?.precioMayorUsd || 0;
  const precioGranMayor = variant?.precioGranMayorUsd || product?.precioGranMayorUsd || 0;

  const hasGranMayor = precioGranMayor > 0 && minGranMayor > minMayor;
  const effectiveQty = Number.isFinite(quantity) && quantity > 0 ? quantity : minMayor;
  const qualifiesGranMayor = hasGranMayor && effectiveQty >= minGranMayor;

  const tarifa: "mayor" | "gran_mayor" = qualifiesGranMayor ? "gran_mayor" : "mayor";
  const unidadesPorPaquete = qualifiesGranMayor ? minGranMayor : minMayor;
  const precioPaquete = qualifiesGranMayor ? precioGranMayor : precioMayor;

  const costoMayor = variant?.costoMayorUsd || product?.costoMayorUsd || precioMayor * 0.75;
  const costoGranMayor =
    variant?.costoGranMayorUsd || product?.costoGranMayorUsd || precioGranMayor * 0.75;
  const costoPaquete = qualifiesGranMayor ? costoGranMayor : costoMayor;

  const paquetes = effectiveQty / unidadesPorPaquete;
  const subtotalUsd = Math.round(precioPaquete * paquetes * 100) / 100;
  const costoTotalUsd = Math.round(costoPaquete * paquetes * 100) / 100;

  return {
    tarifa,
    minMayor,
    minGranMayor,
    hasGranMayor,
    unidadesPorPaquete,
    precioMayor,
    precioGranMayor,
    precioPaquete,
    costoPaquete,
    subtotalUsd,
    costoTotalUsd,
  };
}
