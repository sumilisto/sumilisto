import { describe, it, expect } from "vitest";
import { generateNeuromarketingContent } from "@/lib/grilla/neuromarketing";
import {
  pickProductForSocial,
  pickProductForMercadoLibre,
  generateFullDayGrilla,
  refreshSlotWithNewProduct,
  getPast14DaysList,
  getRecentSocialProductIds,
  getMercadoLibrePublishedProductIds,
} from "@/lib/grilla/scheduler";
import { getDefaultGrillaItems } from "@/lib/grilla/defaults";
import { Product } from "@/types/product";
import { GrillaDia } from "@/types/grilla";

const mockProducts: Product[] = Array.from({ length: 30 }, (_, i) => ({
  id: `prod-${i + 1}`,
  sku: `SKU-${i + 1}`,
  nombre: `Producto Test #${i + 1} 500gr`,
  slug: `producto-test-${i + 1}`,
  categoria: i % 2 === 0 ? "Envases" : "Moldes",
  presentacion: "Unidad",
  unidadVenta: "50 Unidades",
  precioMayorUsd: 10 + i,
  minMayor: 20,
  precioGranMayorUsd: 20 + i * 2,
  minGranMayor: 50,
  stock: 100,
  activo: true,
  status: "disponible",
  isAvailable: true,
  fotos: [{ url: `https://example.com/img-${i + 1}.jpg`, alt: `Foto ${i + 1}` }],
}));

describe("Grilla & Neuromarketing Engine", () => {
  it("generates winning neuromarketing content for Instagram Reels with hook in 0-3s, CTA, and complete copy", () => {
    const prod = mockProducts[0];
    const content = generateNeuromarketingContent(prod, {
      canal: "instagram",
      formatoTipo: "publicacion",
      slotNumber: 1,
      tipo: "IG Publicación 1",
      hora: "08:00 AM",
    });

    expect(content.hookViral).toContain("[0-3 seg]");
    expect(content.problemaEnganche).toBeTruthy();
    expect(content.desarrolloAccion).toBeTruthy();
    expect(content.llamadaAccion).toBeTruthy();
    expect(content.copyCompleto).toBeTruthy();
    expect(content.copyCompleto).toContain("DELIVERY GRATIS");
    expect(content.copyCompleto).toContain(prod.nombre);
  });

  it("generates ideal MercadoLibre copy with title < 60 characters and structured specs", () => {
    const prod = mockProducts[1];
    const content = generateNeuromarketingContent(prod, {
      canal: "mercadolibre",
      formatoTipo: "publicacion",
      slotNumber: 1,
      tipo: "ML Publicación 1",
      hora: "10:00 AM",
    });

    expect(content.mlTitulo).toBeTruthy();
    expect(content.mlTitulo!.length).toBeLessThanOrEqual(60);
    expect(content.copyCompleto).toContain("ESPECIFICACIONES TÉCNICAS");
    expect(content.copyCompleto).toContain("ESCALA DE PRECIOS MAYORISTAS");
    expect(content.copyCompleto).toContain("MÉTODOS DE DESPACHO Y ENTREGA");
    expect(content.copyCompleto).toContain("MÉTODOS DE PAGO");
  });

  it("calculates past 14 days list correctly", () => {
    const list = getPast14DaysList("2026-11-24");
    expect(list.length).toBe(14);
    expect(list[0]).toBe("2026-11-23");
    expect(list[13]).toBe("2026-11-10");
  });

  it("enforces 14-day anti-repetition for social media (Instagram & Facebook)", () => {
    const targetDate = "2026-11-24";
    const excluded = new Set(["prod-1", "prod-2", "prod-3", "prod-4"]);
    const assignedToday = new Set(["prod-5"]);
    const lastSeen = new Map<string, number>();

    const picked = pickProductForSocial(mockProducts, excluded, assignedToday, lastSeen);

    expect(picked).not.toBeNull();
    expect(excluded.has(picked!.id!)).toBe(false);
    expect(assignedToday.has(picked!.id!)).toBe(false);
  });

  it("enforces never-repeated selection for MercadoLibre", () => {
    const publishedInMl = new Set(["prod-1", "prod-2", "prod-3"]);
    const assignedTodayMl = new Set(["prod-4"]);
    const lastSeenMl = new Map<string, number>();

    const picked = pickProductForMercadoLibre(mockProducts, publishedInMl, assignedTodayMl, lastSeenMl);

    expect(picked).not.toBeNull();
    expect(publishedInMl.has(picked!.id!)).toBe(false);
    expect(assignedTodayMl.has(picked!.id!)).toBe(false);
  });

  it("generates full day grilla assigning non-repeating products to all 14 slots", () => {
    const defaultSlots = getDefaultGrillaItems("2026-11-24");
    const historial: Record<string, GrillaDia> = {};

    const { items, assignedCount } = generateFullDayGrilla(
      "2026-11-24",
      defaultSlots,
      mockProducts,
      historial,
      { overwriteExisting: true }
    );

    expect(assignedCount).toBe(14);
    expect(items.length).toBe(14);

    // Verificar que en el mismo día los productos sociales no se repitan
    const socialProductIds = items
      .filter((it) => it.canal === "instagram" || it.canal === "facebook")
      .map((it) => it.productoId);

    const uniqueSocialIds = new Set(socialProductIds);
    expect(uniqueSocialIds.size).toBe(socialProductIds.length);

    // Verificar que los 2 productos de MercadoLibre no se repitan entre sí
    const mlProductIds = items.filter((it) => it.canal === "mercadolibre").map((it) => it.productoId);
    expect(new Set(mlProductIds).size).toBe(2);

    // Verificar que cada item tenga contenido de neuromarketing
    items.forEach((it) => {
      expect(it.contenido).toBeDefined();
      expect(it.contenido?.hookViral).toBeTruthy();
      expect(it.contenido?.copyCompleto).toBeTruthy();
    });
  });

  it("refreshes a single slot with a different product without violating duplicate rules", () => {
    const defaultSlots = getDefaultGrillaItems("2026-11-24");
    const { items } = generateFullDayGrilla("2026-11-24", defaultSlots, mockProducts, {}, { overwriteExisting: true });

    const slotToRefresh = items[0];
    const initialProductId = slotToRefresh.productoId;

    const updatedItems = refreshSlotWithNewProduct(
      slotToRefresh.id,
      "2026-11-24",
      items,
      mockProducts,
      {},
      { changeProduct: true }
    );

    const refreshedSlot = updatedItems.find((it) => it.id === slotToRefresh.id);
    expect(refreshedSlot).toBeDefined();
    expect(refreshedSlot?.productoId).not.toBe(initialProductId);
    expect(refreshedSlot?.contenido).toBeDefined();
  });
});
