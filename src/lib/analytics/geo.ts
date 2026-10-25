// Mapeo exhaustivo de regiones y estados de Venezuela (ISO 3166-2:VE y Vercel/Cloudflare headers)
export const VENEZUELA_STATES: Record<string, string> = {
  A: "Distrito Capital",
  "VE-A": "Distrito Capital",
  "DISTRITO CAPITAL": "Distrito Capital",
  "CARACAS": "Distrito Capital",
  M: "Miranda",
  "VE-M": "Miranda",
  "MIRANDA": "Miranda",
  G: "Carabobo",
  "VE-G": "Carabobo",
  "CARABOBO": "Carabobo",
  V: "Zulia",
  "VE-V": "Zulia",
  "ZULIA": "Zulia",
  D: "Aragua",
  "VE-D": "Aragua",
  "ARAGUA": "Aragua",
  K: "Lara",
  "VE-K": "Lara",
  "LARA": "Lara",
  B: "Anzoátegui",
  "VE-B": "Anzoátegui",
  "ANZOATEGUI": "Anzoátegui",
  F: "Bolívar",
  "VE-F": "Bolívar",
  "BOLIVAR": "Bolívar",
  S: "Táchira",
  "VE-S": "Táchira",
  "TACHIRA": "Táchira",
  I: "Falcón",
  "VE-I": "Falcón",
  "FALCON": "Falcón",
  L: "Mérida",
  "VE-L": "Mérida",
  "MERIDA": "Mérida",
  O: "Nueva Esparta",
  "VE-O": "Nueva Esparta",
  "NUEVA ESPARTA": "Nueva Esparta",
  N: "Monagas",
  "VE-N": "Monagas",
  "MONAGAS": "Monagas",
  P: "Portuguesa",
  "VE-P": "Portuguesa",
  "PORTUGUESA": "Portuguesa",
  Y: "La Guaira",
  "VE-Y": "La Guaira",
  "LA GUAIRA": "La Guaira",
  "VARGAS": "La Guaira",
  T: "Trujillo",
  "VE-T": "Trujillo",
  "TRUJILLO": "Trujillo",
  U: "Yaracuy",
  "VE-U": "Yaracuy",
  "YARACUY": "Yaracuy",
  E: "Barinas",
  "VE-E": "Barinas",
  "BARINAS": "Barinas",
  H: "Cojedes",
  "VE-H": "Cojedes",
  "COJEDES": "Cojedes",
  J: "Guárico",
  "VE-J": "Guárico",
  "GUARICO": "Guárico",
  R: "Sucre",
  "VE-R": "Sucre",
  "SUCRE": "Sucre",
  Z: "Apure",
  "VE-Z": "Apure",
  "APURE": "Apure",
  W: "Delta Amacuro",
  "VE-W": "Delta Amacuro",
  "DELTA AMACURO": "Delta Amacuro",
  X: "Amazonas",
  "VE-X": "Amazonas",
  "AMAZONAS": "Amazonas",
};

export function resolveVenezuelaState(rawRegion?: string | null, rawCity?: string | null): string {
  if (!rawRegion && !rawCity) return "Distrito Capital";

  if (rawRegion) {
    const cleanRegion = rawRegion.trim().toUpperCase();
    if (VENEZUELA_STATES[cleanRegion]) {
      return VENEZUELA_STATES[cleanRegion];
    }
    // Buscar si contiene nombre de estado
    for (const [key, name] of Object.entries(VENEZUELA_STATES)) {
      if (cleanRegion.includes(key)) {
        return name;
      }
    }
  }

  if (rawCity) {
    const cleanCity = rawCity.trim().toLowerCase();
    if (cleanCity.includes("caracas")) return "Distrito Capital";
    if (cleanCity.includes("guarenas") || cleanCity.includes("guatire") || cleanCity.includes("los teques") || cleanCity.includes("chacao") || cleanCity.includes("baruta")) return "Miranda";
    if (cleanCity.includes("maracaibo") || cleanCity.includes("cabimas") || cleanCity.includes("san francisco")) return "Zulia";
    if (cleanCity.includes("valencia") || cleanCity.includes("puerto cabello") || cleanCity.includes("guacara")) return "Carabobo";
    if (cleanCity.includes("maracay") || cleanCity.includes("turmero") || cleanCity.includes("cagua")) return "Aragua";
    if (cleanCity.includes("barquisimeto") || cleanCity.includes("cabudare")) return "Lara";
    if (cleanCity.includes("barcelona") || cleanCity.includes("puerto la cruz") || cleanCity.includes("lecheria")) return "Anzoátegui";
    if (cleanCity.includes("san cristobal")) return "Táchira";
    if (cleanCity.includes("ciudad guayana") || cleanCity.includes("puerto ordaz")) return "Bolívar";
    if (cleanCity.includes("porlamar") || cleanCity.includes("margarita")) return "Nueva Esparta";
  }

  return rawRegion || "Miranda";
}
