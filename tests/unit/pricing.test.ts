import { describe, it, expect } from "vitest";
import {
  calculateProductPrice,
  resolveWholesaleLine,
  getNextWholesaleQuantity,
  getPrevWholesaleQuantity,
} from "@/lib/pricing/pricing";
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

describe("Escalones progresivos de compra (getNextWholesaleQuantity & getPrevWholesaleQuantity)", () => {
  it("salta con 20 + 20 + 10 hacia 50 de Gran Mayor y luego sube de 20 en 20", () => {
    // Ejemplo exacto del cliente: Mayor 20, Gran Mayor 50
    expect(getNextWholesaleQuantity(0, 20, 50)).toBe(20);
    expect(getNextWholesaleQuantity(20, 20, 50)).toBe(40);
    expect(getNextWholesaleQuantity(40, 20, 50)).toBe(50); // Se clava en 50 Gran Mayor
    expect(getNextWholesaleQuantity(50, 20, 50)).toBe(70); // A partir de 50, suma de 20 en 20
    expect(getNextWholesaleQuantity(70, 20, 50)).toBe(90);
    expect(getNextWholesaleQuantity(90, 20, 50)).toBe(110);
  });

  it("desciende correctamente desde cantidades superiores pasando por 50 y luego de 20 en 20", () => {
    expect(getPrevWholesaleQuantity(110, 20, 50)).toBe(90);
    expect(getPrevWholesaleQuantity(90, 20, 50)).toBe(70);
    expect(getPrevWholesaleQuantity(70, 20, 50)).toBe(50);
    expect(getPrevWholesaleQuantity(50, 20, 50)).toBe(40); // 50 -> 40
    expect(getPrevWholesaleQuantity(40, 20, 50)).toBe(20);
    expect(getPrevWholesaleQuantity(20, 20, 50)).toBe(0);
  });

  it("funciona con múltiplos exactos (ej. Mayor 12, Gran Mayor 36)", () => {
    expect(getNextWholesaleQuantity(0, 12, 36)).toBe(12);
    expect(getNextWholesaleQuantity(12, 12, 36)).toBe(24);
    expect(getNextWholesaleQuantity(24, 12, 36)).toBe(36);
    expect(getNextWholesaleQuantity(36, 12, 36)).toBe(48);

    expect(getPrevWholesaleQuantity(48, 12, 36)).toBe(36);
    expect(getPrevWholesaleQuantity(36, 12, 36)).toBe(24);
    expect(getPrevWholesaleQuantity(24, 12, 36)).toBe(12);
    expect(getPrevWholesaleQuantity(12, 12, 36)).toBe(0);
  });

  it("funciona sin Gran Mayor definido (sube y baja sólo de minMayor)", () => {
    expect(getNextWholesaleQuantity(0, 25)).toBe(25);
    expect(getNextWholesaleQuantity(25, 25)).toBe(50);
    expect(getNextWholesaleQuantity(50, 25)).toBe(75);

    expect(getPrevWholesaleQuantity(75, 25)).toBe(50);
    expect(getPrevWholesaleQuantity(50, 25)).toBe(25);
    expect(getPrevWholesaleQuantity(25, 25)).toBe(0);
  });
});
