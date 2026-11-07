/**
 * Genera un código de pedido de 4 dígitos no correlativo (#SUMI-XXXX).
 * Garantiza que NO se repita con ningún pedido activo existente en el sistema.
 *
 * Si un pedido es cancelado y eliminado (tras los 2 minutos de cortesía),
 * su código queda liberado y vuelve a estar disponible para futuros pedidos.
 */
export function generateUniqueOrderCode(existingCodes: (string | undefined | null)[] = []): string {
  const usedCodes = new Set(
    existingCodes
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .map((c) => c.toUpperCase().trim())
  );

  // Intentos aleatorios (para mantener el código no secuencial / impredecible)
  for (let i = 0; i < 3000; i++) {
    const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
    const candidate = `#SUMI-${randomFourDigits}`;
    if (!usedCodes.has(candidate)) {
      return candidate;
    }
  }

  // Fallback determinista si hubiera muchas colisiones: buscar de 1000 a 9999
  for (let num = 1000; num <= 9999; num++) {
    const candidate = `#SUMI-${num}`;
    if (!usedCodes.has(candidate)) {
      return candidate;
    }
  }

  // Fallback en el caso extremo de agotar 9,000 pedidos activos simultáneos
  return `#SUMI-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function generateOrderCode(existingCodes?: (string | undefined | null)[]): string {
  return generateUniqueOrderCode(existingCodes || []);
}


