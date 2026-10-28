import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getBcvRate } from "@/lib/api/store";
import { STORE_CATEGORIES } from "@/lib/constants/brand";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryChips } from "@/components/store/CategoryChips";
import { ChevronRight, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim();
  const category = STORE_CATEGORIES.find((c) => c.slug.toLowerCase() === decodedSlug.toLowerCase());

  const catName = category ? category.nombre : (decodedSlug.charAt(0).toUpperCase() + decodedSlug.slice(1).replace(/-/g, " "));
  const catDesc = category ? category.descripcion : `Catálogo mayorista de ${catName} con venta al mayor y gran mayor para tu negocio.`;

  return {
    title: `${catName} al Mayor`,
    description: catDesc,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim();
  const category = STORE_CATEGORIES.find((c) => c.slug.toLowerCase() === decodedSlug.toLowerCase());

  const [allProducts, bcvRate] = await Promise.all([
    getProducts(),
    getBcvRate(),
  ]);

  const catName = category ? category.nombre : (decodedSlug.charAt(0).toUpperCase() + decodedSlug.slice(1).replace(/-/g, " "));
  const catDesc = category ? category.descripcion : `Catálogo mayorista de ${catName} con venta al mayor y gran mayor para tu negocio.`;

  const products = allProducts.filter(
    (p) =>
      (category && p.categoria.toLowerCase() === category.nombre.toLowerCase()) ||
      p.categoria.toLowerCase() === decodedSlug.toLowerCase() ||
      p.categoria.toLowerCase().replace(/\s+/g, "-") === decodedSlug.toLowerCase()
  );

  if (!category && products.length === 0) {
    notFound();
  }

  // Extraer subcategorías únicas
  const subcategories = Array.from(
    new Set(products.map((p) => p.subcategoria).filter(Boolean))
  ) as string[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Migas de pan (Breadcrumbs) */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900">{catName}</span>
      </nav>

      {/* Cabecera de la Categoría */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Línea Mayorista
            </span>
            <span className="text-xs text-slate-400">· {products.length} productos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {catName}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {catDesc}
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand border border-slate-200 rounded-xl px-3 py-2 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
      </div>

      {/* Selector de categorías para navegación rápida */}
      <CategoryChips activeCategory={category ? category.slug : decodedSlug} />

      {/* Subcategorías si existen */}
      {subcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="font-semibold text-slate-500 whitespace-nowrap">Filtrar:</span>
          {subcategories.map((sub) => (
            <span
              key={sub}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium whitespace-nowrap border border-slate-200"
            >
              {sub}
            </span>
          ))}
        </div>
      )}

      {/* Rejilla de productos */}
      <section>
        {products.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <p className="text-base font-semibold text-slate-800">
              No hay productos disponibles en esta categoría por el momento.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-sm font-bold text-brand hover:underline"
            >
              Ver otras categorías
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.sku} product={product} bcvRate={bcvRate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
