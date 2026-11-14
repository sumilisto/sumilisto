import { describe, it, expect } from "vitest";
import { generateTotpSecret, generateTotp, verifyTotp } from "@/lib/security/totp";

describe("TOTP Two-Factor Authentication", () => {
  it("debe generar un secreto Base32 válido", () => {
    const secret = generateTotpSecret(20);
    expect(secret).toHaveLength(20);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it("debe generar un código de 6 dígitos numéricos", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const code = generateTotp(secret, 1700000000000);
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it("debe verificar correctamente un código válido y tolerar desfase de reloj", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = 1700000000000;
    const currentCode = generateTotp(secret, now);

    expect(verifyTotp(currentCode, secret, 1, now)).toBe(true);

    // 25 segundos después (mismo bloque o siguiente ventana tolerada)
    expect(verifyTotp(currentCode, secret, 1, now + 25000)).toBe(true);

    // Código incorrecto
    expect(verifyTotp("000000", secret, 1, now)).toBe(false);
    expect(verifyTotp("123", secret, 1, now)).toBe(false);
  });
});

