import { unstable_cache } from "next/cache";
import { getProducts as getSupabaseProducts, getBcvRate as getSupabaseBcvRate } from "@/lib/supabase/queries";
import { Product } from "@/types/product";

// 1. OBTENER PRODUCTOS (Caché de 30 segundos)
export const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const products = await getSupabaseProducts();

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
  ["supabase-products"],
  { revalidate: 30, tags: ["products"] }
);

// 2. OBTENER TASA BCV (Caché de 5 minutos)
export const getBcvRate = unstable_cache(
  async (): Promise<number> => {
    try {
      return await getSupabaseBcvRate();
    } catch (error) {
      console.error("Error leyendo tasa BCV:", error);
      return 42.50;
    }
  },
  ["supabase-bcv"],
  { revalidate: 300, tags: ["bcv"] }
);
