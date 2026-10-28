import { MetadataRoute } from "next";
import { getProducts } from "@/lib/api/store";
import { getStoreSettings } from "@/lib/actions/settings";
import { STORE_CATEGORIES } from "@/lib/constants/brand";

export const revalidate = 3600; // Revalidar el sitemap cada 1 hora automáticamente

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sumilisto.com";
  const now = new Date();

  // 1. Páginas Institucionales Estáticas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sobre-nosotros`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/preguntas-frecuentes`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const [products, settings] = await Promise.all([
      getProducts(),
      getStoreSettings(),
    ]);

    const deletedCats = (settings?.deletedCategories || []).map((c) => c.toLowerCase().trim());

    // Recolectar categorías activas únicas
    const activeCategorySlugs = new Set<string>();

    // A. Categorías base no eliminadas
    STORE_CATEGORIES.forEach((cat) => {
      const slug = cat.slug.toLowerCase().trim();
      const name = cat.nombre.toLowerCase().trim();
      if (!deletedCats.includes(slug) && !deletedCats.includes(name)) {
        activeCategorySlugs.add(slug);
      }
    });

    // B. Categorías personalizadas activas
    (settings?.customCategories || []).forEach((cat) => {
      const slug = cat.toLowerCase().trim().replace(/\s+/g, "-");
      if (!deletedCats.includes(slug) && !deletedCats.includes(cat.toLowerCase().trim())) {
        activeCategorySlugs.add(slug);
      }
    });

    // C. Categorías de los productos en catálogo
    products.forEach((p) => {
      if (p.categoria) {
        p.categoria.split(",").forEach((c) => {
          const raw = c.trim().toLowerCase();
          const slug = raw.replace(/\s+/g, "-");
          if (slug && !deletedCats.includes(raw) && !deletedCats.includes(slug)) {
            activeCategorySlugs.add(slug);
          }
        });
      }
    });

    const categoryRoutes: MetadataRoute.Sitemap = Array.from(activeCategorySlugs).map((slug) => ({
      url: `${baseUrl}/categoria/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/producto/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    return [...staticPages, ...categoryRoutes, ...productRoutes];
  } catch (error) {
    console.error("Error generando sitemap dinámico para SEO:", error);
    return staticPages;
  }
}
