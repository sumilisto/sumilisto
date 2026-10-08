import { unstable_cache } from "next/cache";
import { getSheetData, getRawSheetData } from "@/lib/google/sheets";
import { mapSheetRowsToProducts } from "@/lib/google/sheet-mapping";
import { Product } from "@/types/product";

// 1. OBTENER PRODUCTOS (Caché de 5 minutos)
export const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const rawData = await getSheetData("PRODUCTOS");
      const products = mapSheetRowsToProducts(rawData);
      
      // Ordenar: Disponibles primero, luego agotados
      return products.sort((a, b) => {
        if (a.isAvailable === b.isAvailable) return 0;
        return a.isAvailable ? -1 : 1;
      });
    } catch (error) {
      console.error("Error obteniendo productos:", error);
      return [];
    }
  },
  ["google-sheets-products"],
  { revalidate: 300, tags: ["products"] } // 5 minutos de caché (ISR)
);

// 2. OBTENER TASA BCV (Caché de 1 hora)
export const getBcvRate = unstable_cache(
  async (): Promise<number> => {
    // Valor por defecto en caso de fallo absoluto
    let rate = 42.50; 

    try {
      // Intentar leer de la pestaña TASA
      const rows = await getRawSheetData("TASA");
      const flatCells = rows.flat().join(" ");

      // El formato de la hoja es: "$ 1 = Bs.874,73"
      // Capturamos el número que viene DESPUÉS de "Bs."
      const match = flatCells.match(/Bs\.?\s*([\d]+[.,][\d]+)/i);

      if (match && match[1]) {
        // Reemplazar coma por punto para parsear
        const parsed = parseFloat(match[1].replace(",", "."));
        if (!isNaN(parsed) && parsed > 0) {
          rate = parsed;
        }
      }
    } catch (error) {
      console.error("Error leyendo TASA de Google Sheets:", error);
    }

    return rate;
  },
  ["google-sheets-bcv"],
  { revalidate: 3600, tags: ["bcv"] } // 1 hora de caché
);
