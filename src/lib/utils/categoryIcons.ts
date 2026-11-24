import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  ShoppingBag,
  PartyPopper,
  CakeSlice,
  TreePine,
  CupSoda,
  Package,
  Boxes,
  Inbox,
  Soup,
  Ribbon,
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
  if (/(navidad|temporada|ano nuevo|navideno|navidena|diciembre|arbol)/.test(normalized)) {
    return TreePine;
  }

  // 6. Vasos, bebidas, café, copas
  if (/(vaso|bebida|cafe|copa|taza|pitillo|sorbete|jugo|licor)/.test(normalized)) {
    return CupSoda;
  }

  // 7. Cajas, cartón, embalaje
  if (/(caja|carton|embalaje|bulto|estuche)/.test(normalized)) {
    return Package;
  }

  // 8. Bandejas, charolas
  if (/(bandeja|charola|platter)/.test(normalized)) {
    return Inbox;
  }

  // 9. Tinas, salseras, porciones, potes
  if (/(tina|salsera|porcion|tarrina|pote)/.test(normalized)) {
    return Soup;
  }

  // 10. Virutas, confeti, lazos, relleno decorativo
  if (/(viruta|relleno|confeti|lazo|adorno)/.test(normalized)) {
    return Ribbon;
  }

  // 11. Envases, contenedores, anime, térmico, aluminio
  if (/(envase|contenedor|anime|termico|aluminio|tapa|domo|salsa)/.test(normalized)) {
    return Boxes;
  }

  // 12. Cubiertos, comida, alimentos
  if (/(cubierto|tenedor|cuchara|cuchillo|servilleta|plato|comida|alimento)/.test(normalized)) {
    return Utensils;
  }

  // 13. Papel, rollos, film
  if (/(papel|rollo|antigrasa|film|envoplast|etiqueta|cinta|adhesivo)/.test(normalized)) {
    return Scroll;
  }

  // 14. Regalo, obsequio, detalles
  if (/(regalo|obsequio|detalle|sorpresa)/.test(normalized)) {
    return Gift;
  }

  // 15. Limpieza, higiene
  if (/(limpieza|higiene|guante|desinfectante|bolsa de basura|papel higienico|toalla)/.test(normalized)) {
    return SprayCan;
  }

  // 16. Ofertas, descuentos, promociones
  if (/(oferta|descuento|promo|remate|liquidacion)/.test(normalized)) {
    return Percent;
  }

  // Fallback por defecto
  return Tag;
}
