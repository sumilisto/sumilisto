// Mapeo exhaustivo y preciso de países y estados de Venezuela (ISO 3166-2:VE)
export const COUNTRY_NAMES: Record<string, string> = {
  VE: "Venezuela",
  US: "Estados Unidos",
  BR: "Brasil",
  CO: "Colombia",
  ES: "España",
  PA: "Panamá",
  CL: "Chile",
  PE: "Perú",
  MX: "México",
  AR: "Argentina",
  CA: "Canadá",
  DE: "Alemania",
  FR: "Francia",
  GB: "Reino Unido",
  IT: "Italia",
  NL: "Países Bajos",
};

export const VENEZUELA_STATES_EXACT: Record<string, string> = {
  A: "Distrito Capital",
  "VE-A": "Distrito Capital",
  "DISTRITO CAPITAL": "Distrito Capital",
  CARACAS: "Distrito Capital",
  M: "Miranda",
  "VE-M": "Miranda",
  MIRANDA: "Miranda",
  G: "Carabobo",
  "VE-G": "Carabobo",
  CARABOBO: "Carabobo",
  V: "Zulia",
  "VE-V": "Zulia",
  ZULIA: "Zulia",
  D: "Aragua",
  "VE-D": "Aragua",
  ARAGUA: "Aragua",
  K: "Lara",
  "VE-K": "Lara",
  LARA: "Lara",
  B: "Anzoátegui",
  "VE-B": "Anzoátegui",
  ANZOATEGUI: "Anzoátegui",
  F: "Bolívar",
  "VE-F": "Bolívar",
  BOLIVAR: "Bolívar",
  S: "Táchira",
  "VE-S": "Táchira",
  TACHIRA: "Táchira",
  I: "Falcón",
  "VE-I": "Falcón",
  FALCON: "Falcón",
  L: "Mérida",
  "VE-L": "Mérida",
  MERIDA: "Mérida",
  O: "Nueva Esparta",
  "VE-O": "Nueva Esparta",
  "NUEVA ESPARTA": "Nueva Esparta",
  N: "Monagas",
  "VE-N": "Monagas",
  MONAGAS: "Monagas",
  P: "Portuguesa",
  "VE-P": "Portuguesa",
  PORTUGUESA: "Portuguesa",
  Y: "La Guaira",
  "VE-Y": "La Guaira",
  "LA GUAIRA": "La Guaira",
  VARGAS: "La Guaira",
  T: "Trujillo",
  "VE-T": "Trujillo",
  TRUJILLO: "Trujillo",
  U: "Yaracuy",
  "VE-U": "Yaracuy",
  YARACUY: "Yaracuy",
  E: "Barinas",
  "VE-E": "Barinas",
  BARINAS: "Barinas",
  H: "Cojedes",
  "VE-H": "Cojedes",
  COJEDES: "Cojedes",
  J: "Guárico",
  "VE-J": "Guárico",
  GUARICO: "Guárico",
  R: "Sucre",
  "VE-R": "Sucre",
  SUCRE: "Sucre",
  Z: "Apure",
  "VE-Z": "Apure",
  APURE: "Apure",
  W: "Delta Amacuro",
  "VE-W": "Delta Amacuro",
  "DELTA AMACURO": "Delta Amacuro",
  X: "Amazonas",
  "VE-X": "Amazonas",
  AMAZONAS: "Amazonas",
};

/**
 * Resuelve país, estado y ciudad sin mezclar visitas internacionales con estados venezolanos.
 */
export function resolveLocation(
  rawCountry?: string | null,
  rawRegion?: string | null,
  rawCity?: string | null
): { pais: string; estado: string; ciudad: string; isVenezuela: boolean } {
  const cCode = (rawCountry || "VE").trim().toUpperCase();
  const countryName = COUNTRY_NAMES[cCode] || (cCode === "VE" ? "Venezuela" : cCode);
  const cityDecoded = rawCity ? decodeURIComponent(rawCity).trim() : "";

  // 1. Visitas Internacionales (Fuera de Venezuela, ej. bots de Google, AWS, Brasil, USA)
  if (cCode !== "VE" && cCode !== "VENEZUELA") {
    const estado = `Internacional (${countryName})`;
    const ciudad = cityDecoded && cityDecoded !== "Unknown" ? cityDecoded : countryName;
    return { pais: countryName, estado, ciudad, isVenezuela: false };
  }

  // 2. Visitas Nacionales (Venezuela)
  let estado = "Distrito Capital";
  const cleanRegion = (rawRegion || "").trim().toUpperCase();

  if (VENEZUELA_STATES_EXACT[cleanRegion]) {
    estado = VENEZUELA_STATES_EXACT[cleanRegion];
  } else if (cleanRegion.startsWith("VE-") && VENEZUELA_STATES_EXACT[cleanRegion.replace("VE-", "")]) {
    estado = VENEZUELA_STATES_EXACT[cleanRegion.replace("VE-", "")];
  }

  // Deducción por ciudad
  let ciudad = cityDecoded;
  if (!ciudad || ciudad === "Unknown") {
    if (estado === "Distrito Capital") ciudad = "Caracas";
    else if (estado === "Miranda") ciudad = "Guarenas / Guatire";
    else if (estado === "Carabobo") ciudad = "Valencia";
    else if (estado === "Zulia") ciudad = "Maracaibo";
    else ciudad = "Caracas";
  } else {
    const lowerCity = ciudad.toLowerCase();
    if (lowerCity.includes("caracas")) estado = "Distrito Capital";
    else if (lowerCity.includes("guarenas") || lowerCity.includes("guatire") || lowerCity.includes("los teques") || lowerCity.includes("chacao") || lowerCity.includes("baruta")) estado = "Miranda";
    else if (lowerCity.includes("maracaibo") || lowerCity.includes("cabimas")) estado = "Zulia";
    else if (lowerCity.includes("valencia") || lowerCity.includes("puerto cabello")) estado = "Carabobo";
    else if (lowerCity.includes("maracay") || lowerCity.includes("cagua")) estado = "Aragua";
    else if (lowerCity.includes("barquisimeto") || lowerCity.includes("cabudare")) estado = "Lara";
    else if (lowerCity.includes("barcelona") || lowerCity.includes("lecheria") || lowerCity.includes("puerto la cruz")) estado = "Anzoátegui";
    else if (lowerCity.includes("san cristobal") || lowerCity.includes("san cristóbal")) estado = "Táchira";
  }

  return { pais: "Venezuela", estado, ciudad, isVenezuela: true };
}

// Mantener función retrocompatible
export function resolveVenezuelaState(rawRegion?: string | null, rawCity?: string | null): string {
  return resolveLocation("VE", rawRegion, rawCity).estado;
}
