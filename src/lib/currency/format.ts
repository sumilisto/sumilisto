/**
 * Formateo numérico y de moneda adaptado a Venezuela (es-VE)
 * Reglas:
 * - Coma como separador decimal.
 * - Punto como separador de miles.
 * - Ejemplo USD: "$ 12,50"
 * - Ejemplo VES: "Bs. 1.234,56"
 */

export function parseVenezuelanNumber(input: string | number | null | undefined): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }
  if (!input || typeof input !== "string") {
    return 0;
  }

  // Eliminar espacios y símbolos comunes
  const cleaned = input.trim().replace(/[$\sBs.]/g, "");
  
  // Reemplazar la coma decimal por punto
  const standardized = cleaned.replace(",", ".");
  
  const parsed = parseFloat(standardized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUsd(amountInUsd: number): string {
  if (!Number.isFinite(amountInUsd) || amountInUsd < 0) {
    return "$0,00";
  }

  const parts = amountInUsd.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimalPart = parts[1];

  return `$${integerPart},${decimalPart}`;
}

export function formatVes(amountInVes: number): string {
  if (!Number.isFinite(amountInVes) || amountInVes < 0) {
    return "Bs. 0,00";
  }

  const parts = amountInVes.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimalPart = parts[1];

  return `Bs. ${integerPart},${decimalPart}`;
}

/**
 * Convierte un monto en USD a Bolívares (VES) usando la tasa BCV oficial:
 * 1. Redondea los dólares a 2 decimales para hacer la multiplicación.
 * 2. Redondea la tasa del Banco Central a 2 decimales para hacer la multiplicación (para coincidir con lo mostrado al cliente).
 * 3. Multiplica ambos valores con precisión entera.
 * 4. Redondea el resultado final a 2 decimales.
 */
export function calculateVesTotal(totalUsd: number, bcvRate: number): number {
  if (!Number.isFinite(totalUsd) || totalUsd <= 0 || !Number.isFinite(bcvRate) || bcvRate <= 0) {
    return 0;
  }

  // Redondear los dólares a 2 decimales en centavos enteros
  const usdCents = Math.round(totalUsd * 100);

  // Redondear la tasa del Banco Central a 2 decimales en centavos enteros
  const rateCents = Math.round(bcvRate * 100);

  // Multiplicación en aritmética entera y redondeo del resultado a 2 decimales
  const totalVesCents = Math.round((usdCents * rateCents) / 100);

  return totalVesCents / 100;
}

/**
 * Normaliza cualquier número telefónico al formato internacional limpio de WhatsApp
 * Ejemplo: "0422 786-4547" -> "584227864547", "+58 412 1234567" -> "584121234567"
 */
export function normalizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return "584227894547";
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "58" + cleaned.slice(1);
  } else if (!cleaned.startsWith("58") && cleaned.length === 10) {
    cleaned = "58" + cleaned;
  }
  return cleaned || "584227894547";
}

