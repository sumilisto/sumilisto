import { z } from "zod";
import { Product } from "@/types/product";

// Limpia texto tipo "$ 22,75" o "12.5" o "$ 1.234,56" a número
const parseNumber = (val: string | undefined): number => {
  if (!val) return 0;
  const withoutSymbol = val.replace(/\$/g, "").trim();
  const clean = withoutSymbol.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

// Genera un nombre legible a partir del SKU si el nombre viene vacío en la hoja
function generateNameFromSku(sku: string, color?: string): string {
  const parts = sku.split("-");
  if (parts.length >= 2) {
    const type = parts[0] === "DOY" ? "Bolsa Doypack" : parts[0];
    const sizeOrColor = color || parts.slice(1).join(" ");
    return `${type} ${sizeOrColor}`.trim();
  }
  return sku;
}

const SheetRowSchema = z.object({
  sku: z.string().min(1),
  categoria: z.string().optional().default(""),
  producto: z.string().optional().default(""),
  color: z.string().optional().default(""),
  descripcion: z.string().optional().default(""),
  stock: z.string().optional().default("0"),
  "unid al mayor": z.string().optional(),
  "precio al mayor": z.string().optional(),
  "unid gran mayor": z.string().optional(),
  "precio gran mayor": z.string().optional(),
});

export function mapSheetRowsToProducts(rawRows: Record<string, string>[]): Product[] {
  let lastCategory = "Bolsas";
  let lastProductName = "";
  let lastDescription = "";

  const products: Product[] = [];

  for (const rawRow of rawRows) {
    try {
      const normalizedRow: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawRow)) {
        normalizedRow[key.toLowerCase().trim()] = value;
      }

      // Si no hay SKU en esta fila, omitirla
      if (!normalizedRow.sku || !normalizedRow.sku.trim()) {
        continue;
      }

      const parsed = SheetRowSchema.safeParse(normalizedRow);
      if (!parsed.success) {
        continue;
      }

      const data = parsed.data;

      // Forward-fill de categoría, nombre y descripción para variantes
      if (data.categoria && data.categoria.trim()) {
        lastCategory = data.categoria.trim();
      }
      if (data.producto && data.producto.trim()) {
        lastProductName = data.producto.trim();
      }
      if (data.descripcion && data.descripcion.trim()) {
        lastDescription = data.descripcion.trim();
      }

      const productName = data.producto?.trim() || lastProductName || generateNameFromSku(data.sku, data.color);
      const category = data.categoria?.trim() || lastCategory || "Bolsas";
      const description = data.descripcion?.trim() || lastDescription || "";

      const precioMayor = parseNumber(data["precio al mayor"]);
      const precioGranMayor = parseNumber(data["precio gran mayor"]);
      const minMayor = parseNumber(data["unid al mayor"]);
      const minGranMayor = parseNumber(data["unid gran mayor"]);
      const stockNum = parseNumber(data.stock);

      const stockLower = String(data.stock).toLowerCase().trim();
      const hasStock = stockLower !== "0" && stockLower !== "agotado" && stockLower !== "no";
      const isAvailable = precioMayor > 0 && (stockNum > 0 || hasStock);

      products.push({
        sku: data.sku,
        nombre: productName,
        slug: data.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        categoria: category,
        presentacion: data.color ? data.color : "Estándar",
        unidadVenta: minMayor > 1 ? `Paquete x ${minMayor}` : "Unidad",
        precioMayorUsd: precioMayor > 0 ? precioMayor : undefined,
        minMayor: minMayor > 0 ? minMayor : 1,
        precioGranMayorUsd: precioGranMayor > 0 ? precioGranMayor : undefined,
        minGranMayor: minGranMayor > 0 ? minGranMayor : undefined,
        stock: stockNum > 0 ? stockNum : (isAvailable ? 100 : 0),
        activo: true,
        destacado: false,
        fotos: [],
        status: isAvailable ? "disponible" : "agotado",
        isAvailable,
        descripcionLarga: description,
      });
    } catch {
      // Ignorar fila problemática
    }
  }

  return products;
}

// Mantener compatibilidad con mapeo individual
export function mapSheetRowToProduct(rawRow: Record<string, string>): Product | null {
  const result = mapSheetRowsToProducts([rawRow]);
  return result.length > 0 ? result[0] : null;
}
