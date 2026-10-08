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
  const product = allProducts.find((p) => p.slug === slug);

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
  const product = allProducts.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  // Productos relacionados en la misma categoría
  const relatedProducts = allProducts.filter(
    (p) => p.categoria.toLowerCase() === product.categoria.toLowerCase() && p.slug !== product.slug
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
      {/* Migas de pan (Breadcrumbs) */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link
          href={`/categoria/${product.categoria.toLowerCase()}`}
          className="hover:text-slate-900 font-semibold text-slate-700 transition-colors uppercase tracking-wider"
        >
          {product.categoria}
        </Link>
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
                Productos Relacionados en {product.categoria}
              </h2>
            </div>
            <Link
              href={`/categoria/${product.categoria.toLowerCase()}`}
              className="text-xs sm:text-sm font-bold text-brand hover:underline"
            >
              Ver todos en {product.categoria}
            </Link>
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
