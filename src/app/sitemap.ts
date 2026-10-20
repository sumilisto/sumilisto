import { MetadataRoute } from "next";
import { getProducts } from "@/lib/api/store";

export const revalidate = 3600; // Revalidar el sitemap cada 1 hora automáticamente

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sumilisto.com";

  // 1. Rutas Estáticas Principales
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/categoria/envases`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categoria/bolsas`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categoria/cubiertos`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categoria/papel`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sobre-nosotros`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/preguntas-frecuentes`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // 2. Rutas Dinámicas de Productos
  try {
    const products = await getProducts();
    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/producto/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    console.error("Error generando sitemap dinámico para SEO:", error);
    return staticRoutes;
  }
}
