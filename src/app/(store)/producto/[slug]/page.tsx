import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getBcvRate } from "@/lib/api/store";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductDetailView } from "./ProductDetailView";
import { ChevronRight, Layers } from "lucide-react";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const allProducts = await getProducts();
  const decoded = decodeURIComponent(slug).toLowerCase();
  const product = allProducts.find(
    (p) => p.slug.toLowerCase() === decoded || decodeURIComponent(p.slug).toLowerCase() === decoded
  );

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  return {
    title: `${product.nombre} al Mayor | Sumilisto`,
    description: `Compre ${product.nombre} al mayor y gran mayor en Venezuela. Entrega en Caracas, Guarenas y Guatire.`,
    openGraph: {
      title: `${product.nombre} al Mayor | Sumilisto`,
      description: `Presentación: ${product.presentacion}. Suministros para restaurantes en Venezuela.`,
      images: [
        {
          url: product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=800&q=80",
          alt: product.fotos[0]?.alt || product.nombre,
        },
      ],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [allProducts, bcvRate] = await Promise.all([getProducts(), getBcvRate()]);
  const decoded = decodeURIComponent(slug).toLowerCase();
  const product = allProducts.find(
    (p) => p.slug.toLowerCase() === decoded || decodeURIComponent(p.slug).toLowerCase() === decoded
  );

  if (!product) {
    notFound();
  }

  // Productos relacionados en cualquiera de sus categorías
  const productCats = (product.categoria || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const relatedProducts = allProducts
    .filter((p) => {
      if (p.slug === product.slug) return false;
      const pCats = (p.categoria || "")
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);
      return pCats.some((c) => productCats.includes(c));
    })
    .slice(0, 4);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nombre,
    image: product.fotos?.map((f) => f.url) || [],
    description:
      product.descripcionLarga ||
      `Compre ${product.nombre} al mayor y gran mayor en Venezuela. Entrega en Caracas, Guarenas y Guatire.`,
    sku: product.sku,
    category: product.categoria,
    brand: {
      "@type": "Brand",
      name: "Sumilisto",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: product.precioGranMayorUsd || product.precioMayorUsd || 0,
      highPrice: product.precioMayorUsd || 0,
      offerCount: product.variantes?.length || 1,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Sumilisto",
        url: "https://sumilisto.com",
      },
    },
  };

  const categoryList = (product.categoria || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
      {/* Datos Estructurados JSON-LD para Google Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Migas de pan (Breadcrumbs) */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        {categoryList.map((cat, idx) => (
          <React.Fragment key={cat}>
            <Link
              href={`/categoria/${cat.toLowerCase().replace(/\s+/g, "-")}`}
              className="hover:text-slate-900 font-semibold text-slate-700 transition-colors uppercase tracking-wider"
            >
              {cat}
            </Link>
            {idx < categoryList.length - 1 && (
              <span className="text-slate-300">/</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Componente Interactivo de Ficha de Producto con Variantes de Color */}
      <ProductDetailView product={product} bcvRate={bcvRate} />

      {/* Productos Relacionados */}
      {relatedProducts.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" />
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Productos Relacionados {categoryList.length > 0 ? `(${categoryList.join(" · ")})` : ""}
              </h2>
            </div>
            {categoryList.length > 0 && (
              <Link
                href={`/categoria/${categoryList[0].toLowerCase().replace(/\s+/g, "-")}`}
                className="text-xs sm:text-sm font-bold text-brand hover:underline"
              >
                Ver más en {categoryList[0]}
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.sku} product={p} bcvRate={bcvRate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
