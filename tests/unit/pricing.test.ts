import { describe, it, expect } from "vitest";
import { calculateProductPrice } from "@/lib/pricing/pricing";
import { Product } from "@/types/product";

describe("Motor de Precios Mayorista (Pricing Engine)", () => {
  const sampleProduct: Product = {
    sku: "ENV-ALUM-001",
    nombre: "Envase Aluminio",
    slug: "envase-aluminio",
    categoria: "Envases",
    presentacion: "Caja de 250 u.",
    unidadVenta: "Caja",
    precioMayorUsd: 28.50,
    minMayor: 1,
    precioGranMayorUsd: 25.00,
    minGranMayor: 5,
    stock: 50,
    activo: true,
    fotos: [],
    status: "disponible",
    isAvailable: true,
  };

  it("aplica tarifa Mayor para cantidades inferiores a minGranMayor", () => {
    const result = calculateProductPrice(sampleProduct, 2);
    expect(result.isAvailable).toBe(true);
    expect(result.tier).toBe("mayor");
    expect(result.unitPriceUsd).toBe(28.50);
    expect(result.subtotalUsd).toBe(57.00);
    expect(result.savingsNextTier).toBeDefined();
    expect(result.savingsNextTier?.unitsNeeded).toBe(3); // 5 - 2 = 3
  });

  it("aplica tarifa Gran Mayor cuando cantidad >= minGranMayor", () => {
    const result = calculateProductPrice(sampleProduct, 5);
    expect(result.isAvailable).toBe(true);
    expect(result.tier).toBe("gran_mayor");
    expect(result.unitPriceUsd).toBe(25.00);
    expect(result.subtotalUsd).toBe(125.00);
    expect(result.savingsNextTier).toBeUndefined();
  });

  it("aplica tarifa Gran Mayor para volúmenes mayores (ej. 10 unidades)", () => {
    const result = calculateProductPrice(sampleProduct, 10);
    expect(result.tier).toBe("gran_mayor");
    expect(result.subtotalUsd).toBe(250.00);
  });

  it("marca como NO DISPONIBLE si el producto no tiene precio_mayor_usd definido o es 0", () => {
    const unpricedProduct: Product = {
      ...sampleProduct,
      precioMayorUsd: 0,
    };
    const result = calculateProductPrice(unpricedProduct, 1);
    expect(result.isAvailable).toBe(false);
    expect(result.unavailabilityReason).toContain("NO DISPONIBLE");
  });

  it("marca como NO DISPONIBLE si el producto no está activo", () => {
    const inactiveProduct: Product = {
      ...sampleProduct,
      activo: false,
    };
    const result = calculateProductPrice(inactiveProduct, 1);
    expect(result.isAvailable).toBe(false);
  });

  it("marca como agotado si stock <= 0", () => {
    const outOfStockProduct: Product = {
      ...sampleProduct,
      stock: 0,
    };
    const result = calculateProductPrice(outOfStockProduct, 1);
    expect(result.isAvailable).toBe(false);
    expect(result.unavailabilityReason).toBe("Agotado");
  });
});
