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
 * 1. Solo aplica Mayor y Gran Mayor.
 * 2. Si un producto no tiene precio base (precioMayorUsd <= 0), no está disponible.
 * 3. Si cantidad >= minGranMayor y existe precioGranMayorUsd, aplica Gran Mayor.
 * 4. Si falta precioGranMayorUsd, se mantiene precioMayorUsd.
 */
export function calculateProductPrice(
  product: Pick<Product, "sku" | "precioMayorUsd" | "minMayor" | "precioGranMayorUsd" | "minGranMayor" | "stock" | "activo">,
  quantity: number
): PricingResult {
  // Validación de disponibilidad
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

  // Gran Mayor aplica si cantidad >= minGranMayor y el precio está definido y es menor o igual
  const hasGranMayor = granMayorPrice > 0 && minGranMayor > minMayor;
  const qualifiesGranMayor = hasGranMayor && quantity >= minGranMayor;

  let unitPriceUsd = basePrice;
  let tier: "mayor" | "gran_mayor" = "mayor";

  if (qualifiesGranMayor) {
    unitPriceUsd = granMayorPrice;
    tier = "gran_mayor";
  }

  // Cálculo en centavos para precisión
  const unitCents = Math.round(unitPriceUsd * 100);
  const subtotalCents = unitCents * quantity;
  const subtotalUsd = Math.round(subtotalCents) / 100;

  // Notificación de ahorro para el siguiente nivel
  let savingsNextTier: PricingResult["savingsNextTier"] = undefined;
  if (!qualifiesGranMayor && hasGranMayor) {
    const unitsNeeded = minGranMayor - quantity;
    if (unitsNeeded > 0) {
      const savingsPerUnit = Math.round((basePrice - granMayorPrice) * 100) / 100;
      savingsNextTier = {
        unitsNeeded,
        priceNextTierUsd: granMayorPrice,
        savingsPerUnitUsd: savingsPerUnit,
        message: `Agrega ${unitsNeeded} más y paga $ ${granMayorPrice.toFixed(2).replace(".", ",")} c/u (Gran Mayor)`,
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
