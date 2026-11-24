import { Product } from "@/types/product";
import { GrillaItem, GrillaDia, NeuromarketingContent } from "@/types/grilla";
import { generateNeuromarketingContent } from "./neuromarketing";

/**
 * Motor de Asignación y Programación Inteligente de la Grilla (Anti-Repetición)
 *
 * Reglas de negocio:
 * 1. Redes Sociales (Instagram & Facebook):
 *    - Ningún producto puede repetirse en los últimos 14 días (2 semanas móviles).
 *    - Ningún producto puede repetirse en el mismo día.
 *    - Si el catálogo se agota en la ventana de 14 días, se utiliza LRU (menos recientemente usado).
 * 2. MercadoLibre:
 *    - Las publicaciones en MercadoLibre no vencen.
 *    - Cada día se eligen 2 productos nuevos que NUNCA se hayan publicado antes en MercadoLibre.
 *    - Si todos los productos ya se publicaron en ML, se eligen los más antiguos para actualizar/republicar.
 */

// Helper: Extrae la primera foto de un producto
export function getProductThumbnail(product: Product): string | undefined {
  if (product.fotos && product.fotos.length > 0) {
    const primary = product.fotos.find((f) => f.isPrimary);
    return primary ? primary.url : product.fotos[0].url;
  }
  return undefined;
}

// Helper: Obtiene fechas de los últimos 14 días previos a targetDate
export function getPast14DaysList(targetDate: string): string[] {
  const result: string[] = [];
  const base = new Date(`${targetDate}T12:00:00`);
  for (let i = 1; i <= 14; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split("T")[0]);
  }
  return result;
}

// Analiza el historial para obtener productos usados en RRSS en los últimos 14 días
export function getRecentSocialProductIds(
  historial: Record<string, GrillaDia>,
  targetDate: string
): { excludedSocialIds: Set<string>; lastSeenSocialMap: Map<string, number> } {
  const pastDays = new Set(getPast14DaysList(targetDate));
  const excludedSocialIds = new Set<string>();
  const lastSeenSocialMap = new Map<string, number>();

  const allDates = Object.keys(historial || {}).sort();

  for (const dateKey of allDates) {
    const dia = historial[dateKey];
    if (!dia?.items || !Array.isArray(dia.items)) continue;

    const timeVal = new Date(`${dateKey}T12:00:00`).getTime();

    for (const item of dia.items) {
      if ((item.canal === "instagram" || item.canal === "facebook") && item.productoId) {
        lastSeenSocialMap.set(item.productoId, timeVal);

        if (pastDays.has(dateKey)) {
          excludedSocialIds.add(item.productoId);
        }
      }
    }
  }

  return { excludedSocialIds, lastSeenSocialMap };
}

// Analiza el historial para obtener productos ya publicados en MercadoLibre en toda la historia
export function getMercadoLibrePublishedProductIds(
  historial: Record<string, GrillaDia>
): { publishedMlIds: Set<string>; lastSeenMlMap: Map<string, number> } {
  const publishedMlIds = new Set<string>();
  const lastSeenMlMap = new Map<string, number>();

  const allDates = Object.keys(historial || {}).sort();

  for (const dateKey of allDates) {
    const dia = historial[dateKey];
    if (!dia?.items || !Array.isArray(dia.items)) continue;

    const timeVal = new Date(`${dateKey}T12:00:00`).getTime();

    for (const item of dia.items) {
      if (item.canal === "mercadolibre" && item.productoId) {
        publishedMlIds.add(item.productoId);
        lastSeenMlMap.set(item.productoId, timeVal);
      }
    }
  }

  return { publishedMlIds, lastSeenMlMap };
}

/**
 * Selecciona un producto aleatorio para Instagram / Facebook respetando la ventana de 14 días
 */
export function pickProductForSocial(
  allProducts: Product[],
  excluded14DayIds: Set<string>,
  alreadyAssignedTodayIds: Set<string>,
  lastSeenMap: Map<string, number>
): Product | null {
  const activeProducts = allProducts.filter((p) => p.activo !== false && p.id);
  if (activeProducts.length === 0) return null;

  // 1. Prioridad: Productos no usados hoy Y no usados en los últimos 14 días
  const eligibleFresh = activeProducts.filter(
    (p) => !alreadyAssignedTodayIds.has(p.id!) && !excluded14DayIds.has(p.id!)
  );

  if (eligibleFresh.length > 0) {
    const randomIndex = Math.floor(Math.random() * eligibleFresh.length);
    return eligibleFresh[randomIndex];
  }

  // 2. Si el catálogo se agotó en la ventana de 14 días, seleccionamos por LRU (menos recientemente usado)
  // evitando duplicados en el MISMO día
  const availableToday = activeProducts.filter((p) => !alreadyAssignedTodayIds.has(p.id!));
  if (availableToday.length === 0) {
    // Si no queda ningún producto libre hoy, tomamos cualquiera al azar
    return activeProducts[Math.floor(Math.random() * activeProducts.length)];
  }

  // Ordenar por el que se vio hace más tiempo (menor timestamp o 0 si nunca se vio)
  availableToday.sort((a, b) => {
    const timeA = lastSeenMap.get(a.id!) || 0;
    const timeB = lastSeenMap.get(b.id!) || 0;
    return timeA - timeB;
  });

  // Tomamos los primeros (más antiguos) y elegimos al azar entre los más antiguos
  const poolSize = Math.max(1, Math.min(5, Math.ceil(availableToday.length * 0.25)));
  const topCandidates = availableToday.slice(0, poolSize);
  return topCandidates[Math.floor(Math.random() * topCandidates.length)];
}

/**
 * Selecciona un producto aleatorio para MercadoLibre que NUNCA se haya publicado antes
 */
export function pickProductForMercadoLibre(
  allProducts: Product[],
  publishedMlIds: Set<string>,
  alreadyAssignedTodayMlIds: Set<string>,
  lastSeenMlMap: Map<string, number>
): Product | null {
  const activeProducts = allProducts.filter((p) => p.activo !== false && p.id);
  if (activeProducts.length === 0) return null;

  // 1. Productos que NUNCA han sido publicados en MercadoLibre y no se han asignado hoy
  const neverPublished = activeProducts.filter(
    (p) => !alreadyAssignedTodayMlIds.has(p.id!) && !publishedMlIds.has(p.id!)
  );

  if (neverPublished.length > 0) {
    const randomIndex = Math.floor(Math.random() * neverPublished.length);
    return neverPublished[randomIndex];
  }

  // 2. Si ya se publicaron todos los productos del catálogo en ML, tomar el publicado hace más tiempo
  const availableToday = activeProducts.filter((p) => !alreadyAssignedTodayMlIds.has(p.id!));
  if (availableToday.length === 0) {
    return activeProducts[Math.floor(Math.random() * activeProducts.length)];
  }

  availableToday.sort((a, b) => {
    const timeA = lastSeenMlMap.get(a.id!) || 0;
    const timeB = lastSeenMlMap.get(b.id!) || 0;
    return timeA - timeB;
  });

  const poolSize = Math.max(1, Math.min(4, Math.ceil(availableToday.length * 0.2)));
  const topCandidates = availableToday.slice(0, poolSize);
  return topCandidates[Math.floor(Math.random() * topCandidates.length)];
}

/**
 * Genera o llena automáticamente todos los slots de un día con productos y neuromarketing
 */
export function generateFullDayGrilla(
  targetDate: string,
  currentItems: GrillaItem[],
  allProducts: Product[],
  historial: Record<string, GrillaDia>,
  options: { overwriteExisting?: boolean } = { overwriteExisting: false }
): { items: GrillaItem[]; assignedCount: number } {
  const { excludedSocialIds, lastSeenSocialMap } = getRecentSocialProductIds(historial, targetDate);
  const { publishedMlIds, lastSeenMlMap } = getMercadoLibrePublishedProductIds(historial);

  const assignedSocialToday = new Set<string>();
  const assignedMlToday = new Set<string>();

  // Si no se sobreescriben los que ya tienen producto, registrar los existentes
  if (!options.overwriteExisting) {
    for (const item of currentItems) {
      if (item.productoId) {
        if (item.canal === "mercadolibre") {
          assignedMlToday.add(item.productoId);
        } else {
          assignedSocialToday.add(item.productoId);
        }
      }
    }
  }

  let assignedCount = 0;

  const newItems = currentItems.map((item, index) => {
    // Si ya tiene producto y no queremos sobreescribir, respetarlo
    if (!options.overwriteExisting && item.productoId && item.contenido) {
      return item;
    }

    const isMl = item.canal === "mercadolibre";
    let chosenProduct: Product | null = null;

    if (isMl) {
      chosenProduct = pickProductForMercadoLibre(
        allProducts,
        publishedMlIds,
        assignedMlToday,
        lastSeenMlMap
      );
      if (chosenProduct?.id) {
        assignedMlToday.add(chosenProduct.id);
      }
    } else {
      chosenProduct = pickProductForSocial(
        allProducts,
        excludedSocialIds,
        assignedSocialToday,
        lastSeenSocialMap
      );
      if (chosenProduct?.id) {
        assignedSocialToday.add(chosenProduct.id);
      }
    }

    if (!chosenProduct) {
      return item;
    }

    assignedCount++;

    const thumb = getProductThumbnail(chosenProduct);
    const contenido = generateNeuromarketingContent(
      chosenProduct,
      {
        canal: item.canal,
        formatoTipo: item.formatoTipo,
        slotNumber: item.slotNumber,
        tipo: item.tipo,
        hora: item.hora,
      },
      index
    );

    return {
      ...item,
      productoId: chosenProduct.id,
      productoNombre: chosenProduct.nombre,
      productoImagen: thumb,
      productoCategoria: chosenProduct.categoria,
      titulo: isMl && contenido.mlTitulo ? contenido.mlTitulo : `${chosenProduct.nombre} (${contenido.tipoEnfoque || "Estrategia"})`,
      contenido,
    };
  });

  return { items: newItems, assignedCount };
}

/**
 * Refresca un único slot individual: busca otro producto aleatorio que cumpla las reglas
 * y genera una nueva idea ganadora de contenido con neuromarketing.
 */
export function refreshSlotWithNewProduct(
  slotId: string,
  targetDate: string,
  currentItems: GrillaItem[],
  allProducts: Product[],
  historial: Record<string, GrillaDia>,
  options: { changeProduct: boolean } = { changeProduct: true }
): GrillaItem[] {
  const targetItem = currentItems.find((i) => i.id === slotId);
  if (!targetItem) return currentItems;

  const { excludedSocialIds, lastSeenSocialMap } = getRecentSocialProductIds(historial, targetDate);
  const { publishedMlIds, lastSeenMlMap } = getMercadoLibrePublishedProductIds(historial);

  // Productos asignados hoy en otros slots
  const assignedSocialToday = new Set<string>();
  const assignedMlToday = new Set<string>();

  for (const item of currentItems) {
    if (item.id !== slotId && item.productoId) {
      if (item.canal === "mercadolibre") {
        assignedMlToday.add(item.productoId);
      } else {
        assignedSocialToday.add(item.productoId);
      }
    }
  }

  // Evitar también el producto actual del slot si estamos pidiendo cambiar de producto
  if (options.changeProduct && targetItem.productoId) {
    if (targetItem.canal === "mercadolibre") {
      assignedMlToday.add(targetItem.productoId);
    } else {
      assignedSocialToday.add(targetItem.productoId);
    }
  }

  let selectedProduct: Product | null = null;

  if (!options.changeProduct && targetItem.productoId) {
    // Mantener el mismo producto pero generar un ángulo diferente
    selectedProduct = allProducts.find((p) => p.id === targetItem.productoId) || null;
  }

  if (!selectedProduct) {
    if (targetItem.canal === "mercadolibre") {
      selectedProduct = pickProductForMercadoLibre(
        allProducts,
        publishedMlIds,
        assignedMlToday,
        lastSeenMlMap
      );
    } else {
      selectedProduct = pickProductForSocial(
        allProducts,
        excludedSocialIds,
        assignedSocialToday,
        lastSeenSocialMap
      );
    }
  }

  if (!selectedProduct) return currentItems;

  const thumb = getProductThumbnail(selectedProduct);
  const randomSeed = Math.floor(Math.random() * 100);
  const contenido = generateNeuromarketingContent(
    selectedProduct,
    {
      canal: targetItem.canal,
      formatoTipo: targetItem.formatoTipo,
      slotNumber: targetItem.slotNumber,
      tipo: targetItem.tipo,
      hora: targetItem.hora,
    },
    randomSeed
  );

  return currentItems.map((item) => {
    if (item.id !== slotId) return item;

    return {
      ...item,
      productoId: selectedProduct!.id,
      productoNombre: selectedProduct!.nombre,
      productoImagen: thumb,
      productoCategoria: selectedProduct!.categoria,
      titulo:
        targetItem.canal === "mercadolibre" && contenido.mlTitulo
          ? contenido.mlTitulo
          : `${selectedProduct!.nombre} (${contenido.tipoEnfoque || "Estrategia"})`,
      contenido,
    };
  });
}
