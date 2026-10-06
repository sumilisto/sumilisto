import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_PRODUCTS } from "@/lib/mock/products";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductDetailActions } from "./ProductDetailActions";
import {
  ChevronRight,
  ShieldCheck,
  Truck,
  MessageCircle,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug);

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  return {
    title: `${product.nombre} al Mayor | Sumilisto`,
    description: `Compre ${product.nombre} (${product.presentacion}) al mayor y gran mayor en Venezuela. Entrega en Caracas, Guarenas y Guatire.`,
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
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  const bcvRate = 42.50;
  const priceMayor = product.precioMayorUsd ?? 0;
  const priceGranMayor = product.precioGranMayorUsd ?? 0;
  const minGranMayor = product.minGranMayor ?? 0;

  const vesMayor = calculateVesTotal(priceMayor, bcvRate);
  const vesGranMayor = calculateVesTotal(priceGranMayor, bcvRate);

  // Productos relacionados en la misma categoría
  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.categoria === product.categoria && p.sku !== product.sku
  ).slice(0, 4);

  // WhatsApp de consulta directa
  const whatsappUrl = `https://wa.me/584227894547?text=${encodeURIComponent(
    `Hola Sumilisto, quisiera consultar sobre el producto: ${product.nombre} (SKU: ${product.sku}, Presentación: ${product.presentacion})`
  )}`;

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
          className="hover:text-slate-900 transition-colors"
        >
          {product.categoria}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900 truncate max-w-xs">{product.nombre}</span>
      </nav>

      {/* Contenedor Principal: Galería + Ficha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        {/* Columna Izquierda: Galería */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-inner">
            <Image
              src={product.fotos[0]?.url || "https://images.unsplash.com/photo-1584278860047-22db9ff82bed?auto=format&fit=crop&w=800&q=80"}
              alt={product.fotos[0]?.alt || product.nombre}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
              <Badge status={product.status} />
              {product.destacado && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#590317] text-white">
                  Destacado
                </span>
              )}
            </div>
          </div>
          <div className="text-center text-xs text-slate-400">
            Imágenes de referencia · Foto real de producto distribuido
          </div>
        </div>

        {/* Columna Derecha: Detalles, Escala de Precios y Acciones */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              {product.categoria} {product.subcategoria ? `· ${product.subcategoria}` : ""}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {product.nombre}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 pb-4 border-b border-slate-100">
              <span>SKU: <strong className="text-slate-700">{product.sku}</strong></span>
              {product.marca && (
                <>
                  <span>·</span>
                  <span>Marca: <strong className="text-slate-700">{product.marca}</strong></span>
                </>
              )}
              <span>·</span>
              <span>Presentación: <strong className="text-slate-700">{product.presentacion}</strong></span>
            </div>

            {/* Bloque de Precios en USD y Bs. */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Precio al Mayor (Desde {product.minMayor} {product.unidadVenta.toLowerCase()})
              </div>
              {product.isAvailable && priceMayor > 0 ? (
                <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-black text-[#590317]">
                    {formatUsd(priceMayor)}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    / {product.unidadVenta}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    ({formatVes(vesMayor)})
                  </span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 font-semibold bg-white p-3 rounded-xl border border-slate-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>Producto no disponible para compra directa en este momento.</span>
                </div>
              )}
            </div>

            {/* Tabla: Escala de Precios por Volumen */}
            {product.isAvailable && (
              <div className="mt-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#590317]" />
                  <span>Escala de Precios Mayorista</span>
                </h2>
                <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Nivel</th>
                        <th className="py-2.5 px-3">Cantidad Mínima</th>
                        <th className="py-2.5 px-3">Precio USD</th>
                        <th className="py-2.5 px-3">Precio Ref. Bs.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-white">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">Mayor</td>
                        <td className="py-2.5 px-3 text-slate-600">{product.minMayor} {product.unidadVenta}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{formatUsd(priceMayor)}</td>
                        <td className="py-2.5 px-3 text-slate-500">{formatVes(vesMayor)}</td>
                      </tr>
                      {priceGranMayor > 0 && minGranMayor > 0 && (
                        <tr className="bg-emerald-50/50">
                          <td className="py-2.5 px-3 font-bold text-emerald-800 flex items-center gap-1">
                            <span>Gran Mayor</span>
                          </td>
                          <td className="py-2.5 px-3 text-emerald-900 font-medium">{minGranMayor}+ {product.unidadVenta}s</td>
                          <td className="py-2.5 px-3 font-black text-emerald-900">{formatUsd(priceGranMayor)}</td>
                          <td className="py-2.5 px-3 text-emerald-700">{formatVes(vesGranMayor)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Descripción del Producto */}
            {product.descripcionLarga && (
              <div className="mt-5 text-sm text-slate-600 leading-relaxed">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Descripción del Suministro
                </h2>
                <p>{product.descripcionLarga}</p>
              </div>
            )}
          </div>

          {/* Acciones de Compra y Botones */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
            <ProductDetailActions
              product={product}
              whatsappUrl={whatsappUrl}
            />

            {/* Garantías y Zonas */}
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-500">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <Truck className="w-4 h-4 text-[#590317] flex-shrink-0" />
                <span>Despacho Caracas / Guarenas / Guatire</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Confirmación vía WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Productos Relacionados */}
      {relatedProducts.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#590317]" />
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Productos Relacionados en {product.categoria}
              </h2>
            </div>
            <Link
              href={`/categoria/${product.categoria.toLowerCase()}`}
              className="text-xs sm:text-sm font-bold text-[#590317] hover:underline"
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
