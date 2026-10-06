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
    return "$ 0,00";
  }

  const parts = amountInUsd.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimalPart = parts[1];

  return `$ ${integerPart},${decimalPart}`;
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
 * Convierte el total acumulado en USD a Bolívares usando la tasa BCV
 * IMPORTANTE: Siempre se convierte el total para no acumular discrepancias de redondeo en líneas intermedias
 */
export function calculateVesTotal(totalUsd: number, bcvRate: number): number {
  if (totalUsd <= 0 || bcvRate <= 0) return 0;
  // Aritmética precisa en centavos
  const totalCents = Math.round(totalUsd * 100);
  const totalVes = (totalCents * bcvRate) / 100;
  return Math.round(totalVes * 100) / 100;
}
