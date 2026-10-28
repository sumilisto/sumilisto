import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  ShoppingBag,
  PartyPopper,
  CakeSlice,
  Sparkles,
  CupSoda,
  Package,
  Box,
  Utensils,
  Scroll,
  Gift,
  SprayCan,
  Percent,
  Tag,
} from "lucide-react";

export function normalizeCategoryText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Motor inteligente de asignación automática de íconos por Categoría
 * Asigna automáticamente el ícono idóneo de lucide-react según palabras clave.
 */
export function getCategoryIcon(categoryName: string): LucideIcon {
  const normalized = normalizeCategoryText(categoryName);

  if (!normalized) return Tag;

  // 1. Todo / Catálogo
  if (/(todo|catalogo)/.test(normalized)) {
    return LayoutGrid;
  }

  // 2. Bolsas, empaques, kraft, etc.
  if (/(bolsa|kraft|empaque|saco|funda|doypack)/.test(normalized)) {
    return ShoppingBag;
  }

  // 3. Globos, fiesta, eventos, etc.
  if (/(globo|fiesta|cumpleano|celebracion|evento|pinata|decoracion|cortina)/.test(normalized)) {
    return PartyPopper;
  }

  // 4. Repostería, moldes, tortas, postres
  if (/(molde|reposteria|torta|cupcake|capacillo|pastel|postre|dulce)/.test(normalized)) {
    return CakeSlice;
  }

  // 5. Navidad, temporada, año nuevo
  if (/(navidad|temporada|ano nuevo|especial|estrella)/.test(normalized)) {
    return Sparkles;
  }

  // 6. Vasos, bebidas, café, copas
  if (/(vaso|bebida|cafe|copa|taza|pitillo|sorbete|jugo|licor)/.test(normalized)) {
    return CupSoda;
  }

  // 7. Cajas, cartón, embalaje
  if (/(caja|carton|embalaje|bulto|estuche)/.test(normalized)) {
    return Package;
  }

  // 8. Envases, contenedores, bandejas
  if (/(envase|contenedor|tarrina|anime|termico|bandeja|aluminio|tapa|domo|salsa)/.test(normalized)) {
    return Box;
  }

  // 9. Cubiertos, comida, alimentos
  if (/(cubierto|tenedor|cuchara|cuchillo|servilleta|plato|comida|alimento)/.test(normalized)) {
    return Utensils;
  }

  // 10. Papel, rollos, film
  if (/(papel|rollo|antigrasa|film|envoplast|etiqueta|cinta|adhesivo)/.test(normalized)) {
    return Scroll;
  }

  // 11. Regalo, obsequio, detalles
  if (/(regalo|obsequio|lazo|cinta|detalle|sorpresa)/.test(normalized)) {
    return Gift;
  }

  // 12. Limpieza, higiene
  if (/(limpieza|higiene|guante|desinfectante|bolsa de basura|papel higienico|toalla)/.test(normalized)) {
    return SprayCan;
  }

  // 13. Ofertas, descuentos, promociones
  if (/(oferta|descuento|promo|remate|liquidacion)/.test(normalized)) {
    return Percent;
  }

  // Fallback por defecto
  return Tag;
}
