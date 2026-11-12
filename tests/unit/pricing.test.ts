import { describe, it, expect } from "vitest";
import { calculateProductPrice, resolveWholesaleLine } from "@/lib/pricing/pricing";
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
    expect(result.subtotalUsd).toBe(25.00);
    expect(result.savingsNextTier).toBeUndefined();
  });

  it("aplica tarifa Gran Mayor para volúmenes mayores (ej. 10 unidades)", () => {
    const result = calculateProductPrice(sampleProduct, 10);
    expect(result.tier).toBe("gran_mayor");
    expect(result.subtotalUsd).toBe(50.00);
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

describe("Escala automática Mayor y Gran Mayor (resolveWholesaleLine)", () => {
  const moldeNavideno: Pick<
    Product,
    "minMayor" | "precioMayorUsd" | "minGranMayor" | "precioGranMayorUsd"
  > = {
    minMayor: 50,
    precioMayorUsd: 31.57,
    minGranMayor: 200,
    precioGranMayorUsd: 99.47,
  };

  it("mantiene tarifa Mayor por debajo de minGranMayor (50 y 150 unds)", () => {
    const r50 = resolveWholesaleLine(moldeNavideno, null, 50);
    expect(r50.tarifa).toBe("mayor");
    expect(r50.unidadesPorPaquete).toBe(50);
    expect(r50.precioPaquete).toBe(31.57);
    expect(r50.subtotalUsd).toBe(31.57);

    const r150 = resolveWholesaleLine(moldeNavideno, null, 150);
    expect(r150.tarifa).toBe("mayor");
    expect(r150.unidadesPorPaquete).toBe(50);
    expect(r150.subtotalUsd).toBe(94.71);
  });

  it("escala automáticamente a Gran Mayor al alcanzar 200 unds", () => {
    const r200 = resolveWholesaleLine(moldeNavideno, null, 200);
    expect(r200.tarifa).toBe("gran_mayor");
    expect(r200.unidadesPorPaquete).toBe(200);
    expect(r200.precioPaquete).toBe(99.47);
    expect(r200.subtotalUsd).toBe(99.47);
  });

  it("calcula proporcionalmente en Gran Mayor por encima de 200 unds (250 unds)", () => {
    const r250 = resolveWholesaleLine(moldeNavideno, null, 250);
    expect(r250.tarifa).toBe("gran_mayor");
    expect(r250.unidadesPorPaquete).toBe(200);
    expect(r250.subtotalUsd).toBe(124.34);
  });

  it("respeta precios de variante y cae a Mayor si no hay Gran Mayor configurado", () => {
    const soloMayor = { minMayor: 50, precioMayorUsd: 10 };
    const r = resolveWholesaleLine(soloMayor, null, 300);
    expect(r.hasGranMayor).toBe(false);
    expect(r.tarifa).toBe("mayor");
    expect(r.subtotalUsd).toBe(60);

    const conVariante = resolveWholesaleLine(
      moldeNavideno,
      { minMayor: 50, precioMayorUsd: 35, minGranMayor: 200, precioGranMayorUsd: 110 },
      200
    );
    expect(conVariante.tarifa).toBe("gran_mayor");
    expect(conVariante.subtotalUsd).toBe(110);
  });
});
