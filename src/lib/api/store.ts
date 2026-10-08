import { unstable_cache } from "next/cache";
import { getSheetData, getRawSheetData } from "@/lib/google/sheets";
import { mapSheetRowsToProducts } from "@/lib/google/sheet-mapping";
import { Product } from "@/types/product";

// 1. OBTENER PRODUCTOS (Caché de 30 segundos para actualización rápida de Google Sheets)
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
  { revalidate: 30, tags: ["products"] } // 30 segundos
);

// 2. OBTENER TASA BCV (Caché de 5 minutos)
export const getBcvRate = unstable_cache(
  async (): Promise<number> => {
    let rate = 42.50; 

    try {
      const rows = await getRawSheetData("TASA");
      const flatCells = rows.flat().join(" ");

      // El formato de la hoja es: "$ 1 = Bs.874,73"
      const match = flatCells.match(/Bs\.?\s*([\d]+[.,][\d]+)/i);

      if (match && match[1]) {
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
  { revalidate: 300, tags: ["bcv"] } // 5 minutos
);
