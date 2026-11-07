import { describe, it, expect } from "vitest";
import { generateOrderCode, generateUniqueOrderCode } from "@/lib/orders/orderCode";

describe("Order Code Generation (#SUMI-XXXX)", () => {
  it("genera un código con formato #SUMI-XXXX de 4 dígitos", () => {
    const code = generateOrderCode();
    expect(code).toMatch(/^#SUMI-\d{4}$/);
  });

  it("garantiza que el código generado no colisione con códigos activos existentes", () => {
    const existing = ["#SUMI-1234", "#SUMI-5678", "#SUMI-9999"];
    for (let i = 0; i < 50; i++) {
      const code = generateUniqueOrderCode(existing);
      expect(existing).not.toContain(code);
      expect(code).toMatch(/^#SUMI-\d{4}$/);
    }
  });

  it("libera un código cuando ya no está en la lista de existentes (ej. pedido cancelado eliminado)", () => {
    // Si un código no está en la lista, está disponible
    const code = generateUniqueOrderCode([]);
    expect(code).toMatch(/^#SUMI-\d{4}$/);
  });
});
