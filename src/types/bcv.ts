export type BcvRateSource = "sheets_importxml" | "bcv_scraper" | "database_fallback" | "admin_override";

export interface BcvRateData {
  rate: number;                   // Valor numérico de la tasa (ej: 42.50)
  formattedRate: string;          // Formato venezolano: "Bs. 42,50"
  lastUpdated: string;            // Fecha y hora formateada en español
  source: BcvRateSource;
  isOverride: boolean;
  isValid: boolean;
}
