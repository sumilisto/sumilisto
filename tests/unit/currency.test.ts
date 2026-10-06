import { describe, it, expect } from "vitest";
import {
  formatUsd,
  formatVes,
  parseVenezuelanNumber,
  calculateVesTotal,
} from "@/lib/currency/format";

describe("Formateo de Moneda y Conversión es-VE (Currency Module)", () => {
  it("formatea correctamente montos en USD con coma decimal", () => {
    expect(formatUsd(12.5)).toBe("$ 12,50");
    expect(formatUsd(0)).toBe("$ 0,00");
    expect(formatUsd(1234.99)).toBe("$ 1.234,99");
    expect(formatUsd(1000000)).toBe("$ 1.000.000,00");
  });

  it("formatea montos en Bs. con prefijo 'Bs.' y separador de miles", () => {
    expect(formatVes(42.5)).toBe("Bs. 42,50");
    expect(formatVes(1234.56)).toBe("Bs. 1.234,56");
    expect(formatVes(56789.1)).toBe("Bs. 56.789,10");
  });

  it("parsea números con formato venezolano (coma decimal y muchos decimales)", () => {
    expect(parseVenezuelanNumber("123,45678900")).toBe(123.456789);
    expect(parseVenezuelanNumber("42,50")).toBe(42.5);
    expect(parseVenezuelanNumber("Bs. 1.234,56")).toBe(1234.56);
    expect(parseVenezuelanNumber("$ 28,50")).toBe(28.5);
    expect(parseVenezuelanNumber("")).toBe(0);
    expect(parseVenezuelanNumber(null)).toBe(0);
  });

  it("convierte el total en USD a Bs. sin acumular errores de redondeo en centavos", () => {
    const totalUsd = 28.50;
    const bcvRate = 42.50;
    const totalVes = calculateVesTotal(totalUsd, bcvRate);
    expect(totalVes).toBe(1211.25);
  });
});
