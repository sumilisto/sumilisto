import { z } from "zod";
import { Product, ProductVariant } from "@/types/product";

// Limpia texto tipo "$ 22,75" o "12.5" o "$ 1.234,56" a número
const parseNumber = (val: string | undefined): number => {
  if (!val) return 0;
  const withoutSymbol = val.replace(/\$/g, "").trim();
  const clean = withoutSymbol.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

// Genera un slug limpio y amigable
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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

  // Mapa para agrupar productos por su nombre base y categoría
  const groupedMap = new Map<string, {
    nombre: string;
    categoria: string;
    descripcion: string;
    variantes: ProductVariant[];
  }>();

  for (const rawRow of rawRows) {
    try {
      const normalizedRow: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawRow)) {
        normalizedRow[key.toLowerCase().trim()] = value;
      }

      if (!normalizedRow.sku || !normalizedRow.sku.trim()) {
        continue;
      }

      const parsed = SheetRowSchema.safeParse(normalizedRow);
      if (!parsed.success) {
        continue;
      }

      const data = parsed.data;

      // Forward-fill para heredar el nombre/categoría/descripción de la fila padre
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

      const colorFormatted = data.color ? data.color.trim().toUpperCase() : "ESTÁNDAR";

      // Crear variante individual
      const variant: ProductVariant = {
        sku: data.sku,
        color: colorFormatted,
        presentacion: colorFormatted,
        precioMayorUsd: precioMayor > 0 ? precioMayor : undefined,
        minMayor: minMayor > 0 ? minMayor : 1,
        precioGranMayorUsd: precioGranMayor > 0 ? precioGranMayor : undefined,
        minGranMayor: minGranMayor > 0 ? minGranMayor : undefined,
        stock: stockNum > 0 ? stockNum : (isAvailable ? 100 : 0),
        status: isAvailable ? "disponible" : "agotado",
        isAvailable,
        fotos: [],
      };

      // Clave de agrupación única por producto
      const groupKey = `${category}__${productName}`.toLowerCase();

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          nombre: productName,
          categoria: category,
          descripcion: description,
          variantes: [variant],
        });
      } else {
        const group = groupedMap.get(groupKey)!;
        // Evitar variantes duplicadas con el mismo SKU
        if (!group.variantes.some(v => v.sku === variant.sku)) {
          group.variantes.push(variant);
        }
      }
    } catch {
      // Ignorar fila inválida
    }
  }

  // Convertir los grupos agrupados en el arreglo final de Product
  const products: Product[] = [];

  for (const group of Array.from(groupedMap.values())) {
    // Tomar la primera variante disponible como representativa, o la primera variante
    const primaryVariant = group.variantes.find(v => v.isAvailable) || group.variantes[0];
    if (!primaryVariant) continue;

    const baseMinMayor = primaryVariant.minMayor || 1;
    const unidadVenta = baseMinMayor > 1 ? `${baseMinMayor} Unidades` : "Unidad";

    const hasAnyAvailable = group.variantes.some(v => v.isAvailable);

    // Si tiene múltiples colores, la presentación resume las opciones (ej: "Roja, Dorada, Negra")
    const colorsList = group.variantes
      .map(v => v.color)
      .filter((c): c is string => Boolean(c && c !== "ESTÁNDAR"));
    
    const presentacion = colorsList.length > 1
      ? `${colorsList.length} Colores (${colorsList.join(", ")})`
      : (primaryVariant.color || "Unidad");

    const totalStock = group.variantes.reduce((sum, v) => sum + v.stock, 0);

    // Slug amigable basado en el nombre del producto
    const baseSlug = slugify(group.nombre);

    products.push({
      sku: primaryVariant.sku,
      nombre: group.nombre,
      slug: baseSlug || slugify(primaryVariant.sku),
      categoria: group.categoria,
      color: primaryVariant.color,
      presentacion,
      unidadVenta,
      precioMayorUsd: primaryVariant.precioMayorUsd,
      minMayor: primaryVariant.minMayor,
      precioGranMayorUsd: primaryVariant.precioGranMayorUsd,
      minGranMayor: primaryVariant.minGranMayor,
      stock: totalStock,
      activo: true,
      destacado: false,
      fotos: [],
      status: hasAnyAvailable ? "disponible" : "agotado",
      isAvailable: hasAnyAvailable,
      descripcionLarga: group.descripcion,
      variantes: group.variantes,
    });
  }

  return products;
}

export function mapSheetRowToProduct(rawRow: Record<string, string>): Product | null {
  const result = mapSheetRowsToProducts([rawRow]);
  return result.length > 0 ? result[0] : null;
}
