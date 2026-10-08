import { z } from "zod";
import { Product, ProductVariant } from "@/types/product";

// Limpia texto tipo "$ 22,75" o "12.5" a número
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

// Diccionario para decodificar colores comunes de SKUs
const COLOR_MAP: Record<string, string> = {
  ROJ: "ROJA",
  DOR: "DORADA",
  NEG: "NEGRA",
  KRA: "KRAFT",
  TRA: "TRANSPARENTE",
  BLA: "BLANCA",
  PLA: "PLATEADA",
  VER: "VERDE",
  AZU: "AZUL",
};

/**
 * Analiza el SKU (ej: DOY-ROJ-250, DOY-KRA-9X14+3) para extraer:
 * - Color exacto
 * - Identificador único de producto base
 * - Nombre descriptivo si no viene en el Excel
 */
function parseSkuInfo(sku: string): { baseKey: string; color: string; defaultName: string } {
  const parts = sku.toUpperCase().trim().split("-");

  if (parts.length >= 3) {
    const prefix = parts[0];       // DOY
    const colorCode = parts[1];    // ROJ, DOR, NEG, KRA, TRA, BLA
    const sizeCode = parts.slice(2).join("-"); // 250, 500, 1000, 9X14+3, etc.

    const color = COLOR_MAP[colorCode] || colorCode;
    const baseKey = `${prefix}-${sizeCode}`;

    let defaultName = `Bolsa Doypack ${sizeCode}`;
    if (sizeCode === "250" || sizeCode === "500" || sizeCode === "1000") {
      defaultName = `Bolsa para Café ${sizeCode}Gr con Ziplock + Válvula`;
    } else if (sizeCode.includes("X")) {
      defaultName = `Bolsa Doypack ${sizeCode} cm con Ziplock`;
    }

    return { baseKey, color, defaultName };
  }

  return {
    baseKey: sku,
    color: "ESTÁNDAR",
    defaultName: sku,
  };
}

const SheetRowSchema = z.object({
  sku: z.string().min(1),
  categoria: z.string().optional().default(""),
  producto: z.string().optional().default(""),
  color: z.string().optional().default(""),
  descripcion: z.string().optional().default(""),
  stock: z.string().optional().default(""),
  "unid al mayor": z.string().optional(),
  "precio al mayor": z.string().optional(),
  "unid gran mayor": z.string().optional(),
  "precio gran mayor": z.string().optional(),
});

export function mapSheetRowsToProducts(rawRows: Record<string, string>[]): Product[] {
  // Mapa agrupado por clave única de producto base (ej: DOY-250, DOY-500, DOY-9X14+3)
  const groupedMap = new Map<string, {
    baseKey: string;
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
      const sku = data.sku.trim();

      // Extraer datos estructurados del SKU
      const { baseKey, color: skuColor, defaultName } = parseSkuInfo(sku);

      // Usar color del Excel si existe, si no el deducido del SKU
      const finalColor = data.color && data.color.trim() ? data.color.trim().toUpperCase() : skuColor;

      // Nombre del producto: Si el Excel tiene nombre, usarlo; si no, el nombre generado para ese tamaño específico
      const productName = data.producto && data.producto.trim() ? data.producto.trim() : defaultName;
      const category = data.categoria && data.categoria.trim() ? data.categoria.trim() : "Bolsas";
      const description = data.descripcion && data.descripcion.trim()
        ? data.descripcion.trim()
        : `Empaque Doypack resistente con cierre hermético Ziplock. Ideal para café, granos, frutos secos, polvos y alimentos.`;

      const precioMayor = parseNumber(data["precio al mayor"]);
      const precioGranMayor = parseNumber(data["precio gran mayor"]);
      const minMayor = parseNumber(data["unid al mayor"]) || 100;
      const minGranMayor = parseNumber(data["unid gran mayor"]) || 500;
      
      const stockParsed = parseNumber(data.stock);
      const stockNum = data.stock && data.stock.trim() ? stockParsed : 500; // Si no pone stock, asigna 500 por defecto

      const stockLower = String(data.stock).toLowerCase().trim();
      const isExplicitlyAgotado = stockLower === "0" || stockLower === "agotado" || stockLower === "no";
      const isAvailable = precioMayor > 0 && !isExplicitlyAgotado && stockNum > 0;

      const variant: ProductVariant = {
        sku,
        color: finalColor,
        presentacion: finalColor,
        precioMayorUsd: precioMayor > 0 ? precioMayor : undefined,
        minMayor,
        precioGranMayorUsd: precioGranMayor > 0 ? precioGranMayor : undefined,
        minGranMayor,
        stock: isExplicitlyAgotado ? 0 : stockNum,
        status: isAvailable ? "disponible" : "agotado",
        isAvailable,
        fotos: [],
      };

      // Clave de agrupación EXACTA: basada en el baseKey (ej: BOLSAS__DOY-250)
      const groupKey = `${category}__${baseKey}`.toUpperCase();

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          baseKey,
          nombre: productName,
          categoria: category,
          descripcion: description,
          variantes: [variant],
        });
      } else {
        const group = groupedMap.get(groupKey)!;
        // Si no tiene nombre completo pero esta fila sí lo tiene, actualizarlo
        if (data.producto && data.producto.trim()) {
          group.nombre = data.producto.trim();
        }
        if (data.descripcion && data.descripcion.trim()) {
          group.descripcion = data.descripcion.trim();
        }
        // Agregar variante si no existe ya ese SKU
        if (!group.variantes.some(v => v.sku === variant.sku)) {
          group.variantes.push(variant);
        }
      }
    } catch {
      // Ignorar fila inválida
    }
  }

  const products: Product[] = [];

  for (const group of Array.from(groupedMap.values())) {
    const primaryVariant = group.variantes.find(v => v.isAvailable) || group.variantes[0];
    if (!primaryVariant) continue;

    const baseMinMayor = primaryVariant.minMayor || 100;
    const unidadVenta = `${baseMinMayor} Unidades`;

    const hasAnyAvailable = group.variantes.some(v => v.isAvailable);

    // Lista de colores limpios
    const colorsList = group.variantes
      .map(v => v.color)
      .filter((c): c is string => Boolean(c && c !== "ESTÁNDAR"));
    
    const presentacion = colorsList.length > 1
      ? `${colorsList.length} Colores (${colorsList.join(", ")})`
      : (primaryVariant.color || "Unidad");

    const totalStock = group.variantes.reduce((sum, v) => sum + v.stock, 0);

    const baseSlug = slugify(group.nombre);

    products.push({
      sku: primaryVariant.sku,
      nombre: group.nombre,
      slug: baseSlug ? `${baseSlug}-${slugify(group.baseKey)}` : slugify(primaryVariant.sku),
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
