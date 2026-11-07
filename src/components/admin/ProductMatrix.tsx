"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, ProductVariant } from "@/types/product";
import { formatUsd } from "@/lib/currency/format";
import {
  Package, Search, Plus, Filter, ChevronRight, ChevronDown,
  CheckCircle2, AlertCircle, Edit3, Eye, ArrowUpRight, DollarSign,
  Layers, Palette, Sparkles, RefreshCw, X, TrendingUp, Save,
  AlertTriangle, Check, ExternalLink, HelpCircle, ArrowRight
} from "lucide-react";

interface ProductMatrixProps {
  products: Product[];
  onRefresh: () => void;
  onOpenAddModalWithData?: (prefill: Partial<Product>) => void;
  onOpenEditProduct?: (product: Product) => void;
  onOpenMediaModal?: (product: Product) => void;
  onOpenVariantModal?: (product: Product) => void;
}

export const ProductMatrix: React.FC<ProductMatrixProps> = ({
  products,
  onRefresh,
  onOpenAddModalWithData,
  onOpenEditProduct,
  onOpenMediaModal,
  onOpenVariantModal,
}) => {
  // Estados de Filtro y Búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | "publicados" | "pendientes" | "bajo_stock">("todos");

  // Acordeón: IDs de productos expandidos
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Desplegable de "Faltan por Publicar"
  const [showPendingDropdown, setShowPendingDropdown] = useState(false);

  // Modal Rápido: Nuevo Producto en Matriz (Borrador sin fotos obligatorias)
  const [showCreateMatrixModal, setShowCreateMatrixModal] = useState(false);
  const [savingNewProduct, setSavingNewProduct] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: "",
    categoria: "Envases",
    descripcion: "",
    unidadVenta: "50 Unidades",
    variantes: [
      {
        sku: "",
        color: "Estándar",
        presentacion: "50 Unidades",
        stock: 100,
        costoMayorUsd: "",
        minMayor: 50,
        costoGranMayorUsd: "",
        minGranMayor: 200,
        precioMayorUsd: "",
        precioGranMayorUsd: "",
      },
    ],
  });

  // Modal Rápido: Edición de Costos & Stock de una Variante
  const [editingVariantItem, setEditingVariantItem] = useState<{
    productId: string;
    productName: string;
    variant: ProductVariant;
  } | null>(null);
  const [savingVariantEdit, setSavingVariantEdit] = useState(false);
  const [variantEditForm, setVariantEditForm] = useState({
    sku: "",
    color: "",
    presentacion: "",
    stock: 0,
    costoMayorUsd: "",
    minMayor: 50,
    costoGranMayorUsd: "",
    minGranMayor: 200,
    precioMayorUsd: "",
    precioGranMayorUsd: "",
  });

  // Estado para feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Toggle de expansión de un producto
  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    products.forEach((p) => {
      if (p.id) all[p.id] = true;
    });
    setExpandedProductIds(all);
  };

  const collapseAll = () => {
    setExpandedProductIds({});
  };

  // Toggle directo de publicación (activo = true/false)
  const togglePublication = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!product.id) return;

    const nextState = !product.activo;
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nextState }),
      });

      if (!res.ok) throw new Error("Error al cambiar estado");

      showToast(
        nextState
          ? `¡"${product.nombre}" publicado en la tienda web!`
          : `"${product.nombre}" movido a Borrador (no visible en web)`
      );
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Error al actualizar estado", "error");
    }
  };

  // Categorías únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return Array.from(set).sort();
  }, [products]);

  // Lista de Productos que faltan por publicar
  const pendingProducts = useMemo(() => {
    return products.filter((p) => !p.activo);
  }, [products]);

  // Métricas Financieras y Operativas
  const metrics = useMemo(() => {
    let totalSkus = 0;
    let totalStockCombined = 0;
    let inventoryCostTotal = 0;
    let potentialSalesTotal = 0;
    let marginAccumulator = 0;
    let marginCount = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const vars = p.variantes && p.variantes.length > 0 ? p.variantes : [];
      totalSkus += vars.length || 1;

      vars.forEach((v) => {
        const stock = v.stock || 0;
        totalStockCombined += stock;
        if (stock < 50) lowStockCount++;

        const costMayor = v.costoMayorUsd || 0;
        const sellMayor = v.precioMayorUsd || 0;
        const minMayor = v.minMayor || 1;

        // Costo por unidad aproximado
        const costPerUnit = minMayor > 0 ? costMayor / minMayor : 0;
        const sellPerUnit = minMayor > 0 ? sellMayor / minMayor : 0;

        if (costPerUnit > 0) {
          inventoryCostTotal += stock * costPerUnit;
        }
        if (sellPerUnit > 0) {
          potentialSalesTotal += stock * sellPerUnit;
        }

        if (sellMayor > 0 && costMayor > 0) {
          const marginPct = ((sellMayor - costMayor) / sellMayor) * 100;
          marginAccumulator += marginPct;
          marginCount++;
        }
      });
    });

    const averageMargin = marginCount > 0 ? Math.round(marginAccumulator / marginCount) : 0;

    return {
      totalProducts: products.length,
      publishedCount: products.filter((p) => p.activo).length,
      pendingCount: pendingProducts.length,
      totalSkus,
      totalStockCombined,
      inventoryCostTotal: Math.round(inventoryCostTotal * 100) / 100,
      potentialSalesTotal: Math.round(potentialSalesTotal * 100) / 100,
      averageMargin,
      lowStockCount,
    };
  }, [products, pendingProducts]);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.nombre.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.categoria.toLowerCase().includes(q);
        const matchVarSku = p.variantes?.some((v) => v.sku.toLowerCase().includes(q));
        const matchVarColor = p.variantes?.some((v) => v.color?.toLowerCase().includes(q));
        if (!matchName && !matchSku && !matchCat && !matchVarSku && !matchVarColor) {
          return false;
        }
      }

      // 2. Filtro de categoría
      if (selectedCategory !== "todas" && p.categoria !== selectedCategory) {
        return false;
      }

      // 3. Filtro de estado
      if (statusFilter === "publicados" && !p.activo) return false;
      if (statusFilter === "pendientes" && p.activo) return false;
      if (statusFilter === "bajo_stock") {
        const hasLowStock = p.variantes?.some((v) => (v.stock || 0) < 50) || (p.stock || 0) < 50;
        if (!hasLowStock) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, statusFilter]);

  // Abrir modal de edición rápida de variante
  const handleOpenEditVariant = (product: Product, variant: ProductVariant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingVariantItem({
      productId: product.id || "",
      productName: product.nombre,
      variant,
    });
    setVariantEditForm({
      sku: variant.sku || "",
      color: variant.color || "Estándar",
      presentacion: variant.presentacion || "50 Unidades",
      stock: variant.stock || 0,
      costoMayorUsd: variant.costoMayorUsd !== undefined ? String(variant.costoMayorUsd) : "",
      minMayor: variant.minMayor || 50,
      costoGranMayorUsd: variant.costoGranMayorUsd !== undefined ? String(variant.costoGranMayorUsd) : "",
      minGranMayor: variant.minGranMayor || 200,
      precioMayorUsd: variant.precioMayorUsd !== undefined ? String(variant.precioMayorUsd) : "",
      precioGranMayorUsd: variant.precioGranMayorUsd !== undefined ? String(variant.precioGranMayorUsd) : "",
    });
  };

  // Guardar cambios rápidos de la variante
  const handleSaveVariantEdit = async () => {
    if (!editingVariantItem?.variant.id) return;
    setSavingVariantEdit(true);

    try {
      const payload = {
        sku: variantEditForm.sku.trim(),
        color: variantEditForm.color.trim(),
        presentacion: variantEditForm.presentacion.trim(),
        stock: Number(variantEditForm.stock) || 0,
        costo_mayor_usd: variantEditForm.costoMayorUsd ? Number(variantEditForm.costoMayorUsd) : null,
        min_mayor: Number(variantEditForm.minMayor) || 1,
        costo_gran_mayor_usd: variantEditForm.costoGranMayorUsd ? Number(variantEditForm.costoGranMayorUsd) : null,
        min_gran_mayor: Number(variantEditForm.minGranMayor) || 1,
        precio_mayor_usd: Number(variantEditForm.precioMayorUsd) || 0,
        precio_gran_mayor_usd: Number(variantEditForm.precioGranMayorUsd) || 0,
      };

      const res = await fetch(`/api/variants/${editingVariantItem.variant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al guardar cambios de variante");

      showToast(`¡Variante "${variantEditForm.sku}" actualizada correctamente!`);
      setEditingVariantItem(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    } finally {
      setSavingVariantEdit(false);
    }
  };

  // Agregar fila de variante en modal de nuevo producto
  const handleAddCreateVariantRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      variantes: [
        ...prev.variantes,
        {
          sku: "",
          color: "",
          presentacion: prev.unidadVenta || "50 Unidades",
          stock: 100,
          costoMayorUsd: "",
          minMayor: 50,
          costoGranMayorUsd: "",
          minGranMayor: 200,
          precioMayorUsd: "",
          precioGranMayorUsd: "",
        },
      ],
    }));
  };

  const handleRemoveCreateVariantRow = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      variantes: prev.variantes.filter((_, idx) => idx !== index),
    }));
  };

  // Guardar nuevo producto en la matriz
  const handleSaveNewProductMatrix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nombre.trim() || createForm.variantes.length === 0) {
      showToast("Indica al menos el nombre del producto y una variante", "error");
      return;
    }

    setSavingNewProduct(true);

    try {
      // Normalizar slug
      const slug = createForm.nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const primaryVar = createForm.variantes[0];
      const mainSku = primaryVar.sku.trim() || `SKU-${Date.now()}`;

      const productPayload = {
        nombre: createForm.nombre.trim(),
        sku: mainSku,
        slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
        categoria: createForm.categoria,
        descripcion: createForm.descripcion.trim() || undefined,
        unidad_venta: createForm.unidadVenta || "50 Unidades",
        activo: false, // Nace en la Matriz como pendiente por publicar
        destacado: false,
        variantes: createForm.variantes.map((v, i) => ({
          sku: v.sku.trim() || `${mainSku}-VAR${i + 1}`,
          color: v.color.trim() || "Estándar",
          presentacion: v.presentacion.trim() || createForm.unidadVenta || "50 Unidades",
          stock: Number(v.stock) || 0,
          costo_mayor_usd: v.costoMayorUsd ? Number(v.costoMayorUsd) : null,
          min_mayor: Number(v.minMayor) || 50,
          costo_gran_mayor_usd: v.costoGranMayorUsd ? Number(v.costoGranMayorUsd) : null,
          min_gran_mayor: Number(v.minGranMayor) || 200,
          precio_mayor_usd: Number(v.precioMayorUsd) || 0,
          precio_gran_mayor_usd: Number(v.precioGranMayorUsd) || 0,
          activo: true,
        })),
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear producto");
      }

      showToast(`¡Producto registrado en la Matriz! (Listo para publicar cuando desees)`);
      setShowCreateMatrixModal(false);
      setCreateForm({
        nombre: "",
        categoria: "Envases",
        descripcion: "",
        unidadVenta: "50 Unidades",
        variantes: [
          {
            sku: "",
            color: "Estándar",
            presentacion: "50 Unidades",
            stock: 100,
            costoMayorUsd: "",
            minMayor: 50,
            costoGranMayorUsd: "",
            minGranMayor: 200,
            precioMayorUsd: "",
            precioGranMayorUsd: "",
          },
        ],
      });
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Error al crear producto", "error");
    } finally {
      setSavingNewProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Flotante */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-2 ${toastMsg.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-600 text-white border-rose-700"
            }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* 1. Tarjetas de Resumen Financiero & Operativo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Publicaciones
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-800">{metrics.totalProducts}</span>
            <span className="text-xs font-semibold text-slate-500">modelos</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-500" /> Total SKUs
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-blue-700">{metrics.totalSkus}</span>
            <span className="text-xs font-semibold text-slate-500">variantes</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Stock Total
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {metrics.totalStockCombined.toLocaleString("es-VE")}
            </span>
            <span className="text-xs font-semibold text-slate-500">unids</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" /> Inv. al Costo
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-black text-emerald-800">
              {formatUsd(metrics.inventoryCostTotal)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Margen Promedio
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-900">
              +{metrics.averageMargin}%
            </span>
          </div>
        </div>

        <div className={`rounded-2xl p-4 border shadow-2xs transition-all ${metrics.pendingCount > 0
            ? "bg-amber-50/80 border-amber-300 text-amber-950"
            : "bg-white border-slate-200 text-slate-800"
          }`}>
          <span className="text-[11px] font-bold uppercase tracking-wider block flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Por Publicar
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-700">{metrics.pendingCount}</span>
            <span className="text-xs font-bold text-amber-800">en borrador</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Control: Acciones Superiores & Desplegable "Faltan por Publicar" */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Izquierda: Buscador y Filtro Categoría */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por SKU, Nombre, Color o Categoría..."
              className="w-full h-10 pl-9.5 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="todas">Todas las Categorías ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Derecha: Desplegable Faltan por Publicar + Botón Nuevo */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Desplegable de Faltan por Publicar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPendingDropdown(!showPendingDropdown)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${metrics.pendingCount > 0
                  ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Faltan por Publicar ({metrics.pendingCount})</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {showPendingDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in zoom-in-95">
                <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Productos en Matriz listos para Publicar:
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {pendingProducts.length}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                  {pendingProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      🎉 ¡Todo tu inventario está publicado en la tienda web!
                    </div>
                  ) : (
                    pendingProducts.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {p.nombre}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>SKU: {p.sku}</span>
                            <span>·</span>
                            <span>{p.variantes?.length || 1} SKU/Colores</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-700">Stock: {p.stock}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPendingDropdown(false);
                            togglePublication(p);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shrink-0 shadow-xs"
                          title="Publicar en tienda con 1 clic"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Publicar</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botón Nuevo Producto en Matriz */}
          <button
            type="button"
            onClick={() => setShowCreateMatrixModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo en Matriz</span>
          </button>
        </div>
      </div>

      {/* 3. Píldoras de Filtro de Estado + Acciones de Expansión */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("todos")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === "todos"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
          >
            Todos ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("publicados")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${statusFilter === "publicados"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Publicados ({metrics.publishedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pendientes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${statusFilter === "pendientes"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Faltan por Publicar ({metrics.pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("bajo_stock")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${statusFilter === "bajo_stock"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white text-rose-800 border border-rose-200 hover:bg-rose-50"
              }`}
          >
            <span>⚠️ Bajo Stock ({metrics.lowStockCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="text-slate-500 hover:text-slate-900 font-bold hover:underline"
          >
            Expandir todos
          </button>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-slate-500 hover:text-slate-900 font-bold hover:underline"
          >
            Colapsar todos
          </button>
        </div>
      </div>

      {/* 4. Tabla Jerárquica Expandible (Padre ➔ Variantes/SKUs) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-10 text-center">Exp</th>
                <th className="py-3 px-3">Producto / Publicación</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 text-center">Variantes</th>
                <th className="py-3 px-3 text-right">Stock Total</th>
                <th className="py-3 px-4 text-right">Venta Mayor</th>
                <th className="py-3 px-4 text-right">Venta G. Mayor</th>
                <th className="py-3 px-4 text-center">Estado Web</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-bold text-sm text-slate-600">No se encontraron productos en la matriz</p>
                    <p className="text-xs text-slate-400 mt-0.5">Prueba cambiando los filtros de búsqueda</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isExpanded = Boolean(expandedProductIds[product.id || ""]);
                  const variants = product.variantes && product.variantes.length > 0 ? product.variantes : [];
                  const isLowStock = (product.stock || 0) < 50;

                  return (
                    <React.Fragment key={product.id}>
                      {/* FILA PADRE: Publicación Web */}
                      <tr
                        onClick={() => product.id && toggleExpand(product.id)}
                        className={`cursor-pointer transition-colors ${isExpanded
                            ? "bg-slate-50/90 font-medium"
                            : "hover:bg-slate-50/60"
                          } ${!product.activo ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-emerald-500"}`}
                      >
                        {/* Botón Expandir */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (product.id) toggleExpand(product.id);
                            }}
                            className="w-6 h-6 rounded-md hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-transform"
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90 text-brand" : ""
                                }`}
                            />
                          </button>
                        </td>

                        {/* Nombre y Miniatura */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              {product.fotos?.[0]?.url ? (
                                <img
                                  src={product.fotos[0].url}
                                  alt={product.nombre}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs sm:max-w-md">
                              <span className="font-extrabold text-slate-900 block truncate text-xs sm:text-sm">
                                {product.nombre}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                SKU Base: {product.sku}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="py-3.5 px-3">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                            {product.categoria}
                          </span>
                        </td>

                        {/* Cantidad de Variantes / SKUs */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${variants.length > 1
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : "bg-slate-100 text-slate-700"
                            }`}>
                            <Palette className="w-3 h-3" />
                            <span>{variants.length} SKU{variants.length !== 1 ? "s" : ""}</span>
                          </span>
                        </td>

                        {/* Stock Total */}
                        <td className="py-3.5 px-3 text-right">
                          <span className={`font-black text-xs sm:text-sm ${isLowStock ? "text-rose-600" : "text-slate-800"
                            }`}>
                            {(product.stock || 0).toLocaleString("es-VE")}
                          </span>
                          <span className="text-[10px] text-slate-400 block">unidades</span>
                        </td>

                        {/* Precios de Venta */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-extrabold text-emerald-800 block">
                            {product.precioMayorUsd ? formatUsd(product.precioMayorUsd) : "$0,00"}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            x {product.minMayor || 50} u.
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-extrabold text-brand block">
                            {product.precioGranMayorUsd ? formatUsd(product.precioGranMayorUsd) : "$0,00"}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            x {product.minGranMayor || 200} u.
                          </span>
                        </td>

                        {/* Estado Web: Switch / Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => togglePublication(product, e)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all ${product.activo
                                ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300"
                                : "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300"
                              }`}
                            title="Haz clic para publicar u ocultar en la tienda web"
                          >
                            <span className={`w-2 h-2 rounded-full ${product.activo ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                            <span>{product.activo ? "Publicado" : "Borrador"}</span>
                          </button>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {onOpenEditProduct && (
                              <button
                                type="button"
                                onClick={() => onOpenEditProduct(product)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                                title="Editar producto completo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {product.activo && (
                              <Link
                                href={`/producto/${product.slug}`}
                                target="_blank"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Ver en tienda web"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* FILAS HIJAS: Variantes de Color / SKUs individuales */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={9} className="p-3 sm:p-4">
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                              <div className="p-3 bg-gradient-to-r from-slate-100 via-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-brand" />
                                  <span className="font-extrabold text-xs text-slate-800">
                                    Estructura de Variantes, Costos y Precios ({variants.length} SKUs)
                                  </span>
                                </div>
                                {onOpenVariantModal && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenVariantModal(product)}
                                    className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Gestionar Variantes</span>
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-black uppercase text-[9px] tracking-wider">
                                      <th className="py-2.5 px-3">Variante / Color</th>
                                      <th className="py-2.5 px-3 font-mono">SKU Único</th>
                                      <th className="py-2.5 px-3 text-right">Stock</th>
                                      <th className="py-2.5 px-3 text-right text-amber-900 bg-amber-50/50">Costo Mayor</th>
                                      <th className="py-2.5 px-2 text-center text-amber-900 bg-amber-50/50">Cant. M</th>
                                      <th className="py-2.5 px-3 text-right text-amber-900 bg-amber-50/50">Costo G. Mayor</th>
                                      <th className="py-2.5 px-2 text-center text-amber-900 bg-amber-50/50">Cant. GM</th>
                                      <th className="py-2.5 px-3 text-right text-emerald-900 bg-emerald-50/40">PVP Mayor</th>
                                      <th className="py-2.5 px-3 text-right text-emerald-900 bg-emerald-50/40">PVP G. Mayor</th>
                                      <th className="py-2.5 px-3 text-center text-indigo-900">Margen Mayor</th>
                                      <th className="py-2.5 px-3 text-center">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {variants.map((variant) => {
                                      const costM = variant.costoMayorUsd || 0;
                                      const sellM = variant.precioMayorUsd || 0;
                                      const profitM = Math.round((sellM - costM) * 100) / 100;
                                      const marginPctM = sellM > 0 && costM > 0
                                        ? Math.round(((sellM - costM) / sellM) * 100)
                                        : 0;

                                      return (
                                        <tr key={variant.id || variant.sku} className="hover:bg-slate-50/80 transition-colors">
                                          {/* Color */}
                                          <td className="py-2.5 px-3 font-bold text-slate-800">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                                              <span>{variant.color || "Estándar"}</span>
                                            </div>
                                          </td>

                                          {/* SKU */}
                                          <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold">
                                            {variant.sku}
                                          </td>

                                          {/* Stock */}
                                          <td className="py-2.5 px-3 text-right font-black">
                                            <span className={(variant.stock || 0) < 50 ? "text-rose-600" : "text-slate-800"}>
                                              {variant.stock || 0}
                                            </span>
                                          </td>

                                          {/* Costo Mayor */}
                                          <td className="py-2.5 px-3 text-right font-bold text-amber-950 bg-amber-50/30">
                                            {variant.costoMayorUsd !== undefined && variant.costoMayorUsd > 0
                                              ? formatUsd(variant.costoMayorUsd)
                                              : <span className="text-slate-300 italic">No asignado</span>}
                                          </td>

                                          {/* Cant. Mayor */}
                                          <td className="py-2.5 px-2 text-center text-slate-600 bg-amber-50/30">
                                            {variant.minMayor || 50} u.
                                          </td>

                                          {/* Costo Gran Mayor */}
                                          <td className="py-2.5 px-3 text-right font-bold text-amber-950 bg-amber-50/30">
                                            {variant.costoGranMayorUsd !== undefined && variant.costoGranMayorUsd > 0
                                              ? formatUsd(variant.costoGranMayorUsd)
                                              : <span className="text-slate-300 italic">No asignado</span>}
                                          </td>

                                          {/* Cant. Gran Mayor */}
                                          <td className="py-2.5 px-2 text-center text-slate-600 bg-amber-50/30">
                                            {variant.minGranMayor || 200} u.
                                          </td>

                                          {/* PVP Mayor */}
                                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-800 bg-emerald-50/30">
                                            {variant.precioMayorUsd ? formatUsd(variant.precioMayorUsd) : "$0,00"}
                                          </td>

                                          {/* PVP Gran Mayor */}
                                          <td className="py-2.5 px-3 text-right font-extrabold text-brand bg-emerald-50/30">
                                            {variant.precioGranMayorUsd ? formatUsd(variant.precioGranMayorUsd) : "$0,00"}
                                          </td>

                                          {/* Margen Mayor */}
                                          <td className="py-2.5 px-3 text-center">
                                            {marginPctM > 0 ? (
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-black text-[10px] ${marginPctM >= 25
                                                  ? "bg-emerald-100 text-emerald-900"
                                                  : marginPctM >= 15
                                                    ? "bg-blue-100 text-blue-900"
                                                    : "bg-amber-100 text-amber-900"
                                                }`}>
                                                +{marginPctM}% (${profitM.toFixed(2).replace(".", ",")})
                                              </span>
                                            ) : (
                                              <span className="text-slate-300">—</span>
                                            )}
                                          </td>

                                          {/* Botón Edición Rápida */}
                                          <td className="py-2.5 px-3 text-center">
                                            <button
                                              type="button"
                                              onClick={(e) => handleOpenEditVariant(product, variant, e)}
                                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 mx-auto"
                                            >
                                              <Edit3 className="w-3 h-3 text-brand" />
                                              <span>Editar</span>
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: Edición Rápida de Costos & Stock de una Variante */}
      {editingVariantItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Editar Costos e Inventario de Variante
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingVariantItem.productName} · {variantEditForm.color}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingVariantItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU Único</label>
                  <input
                    type="text"
                    value={variantEditForm.sku}
                    onChange={(e) => setVariantEditForm({ ...variantEditForm, sku: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Color / Presentación</label>
                  <input
                    type="text"
                    value={variantEditForm.color}
                    onChange={(e) => setVariantEditForm({ ...variantEditForm, color: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Stock Disponible (Unidades)</label>
                <input
                  type="number"
                  value={variantEditForm.stock}
                  onChange={(e) => setVariantEditForm({ ...variantEditForm, stock: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-black text-sm text-slate-900"
                />
              </div>

              {/* Bloque de Costos */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <span className="font-black text-amber-900 text-xs block flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Estructura de Costos (Privado)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Costo Mayor ($)</label>
                    <input
                      type="text"
                      value={variantEditForm.costoMayorUsd}
                      onChange={(e) => setVariantEditForm({ ...variantEditForm, costoMayorUsd: e.target.value })}
                      placeholder="Ej: 22.00"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Cant. Mayor (Unds)</label>
                    <input
                      type="number"
                      value={variantEditForm.minMayor}
                      onChange={(e) => setVariantEditForm({ ...variantEditForm, minMayor: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Costo Gran Mayor ($)</label>
                    <input
                      type="text"
                      value={variantEditForm.costoGranMayorUsd}
                      onChange={(e) => setVariantEditForm({ ...variantEditForm, costoGranMayorUsd: e.target.value })}
                      placeholder="Ej: 70.00"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">Cant. Gran Mayor (Unds)</label>
                    <input
                      type="number"
                      value={variantEditForm.minGranMayor}
                      onChange={(e) => setVariantEditForm({ ...variantEditForm, minGranMayor: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque Precios de Venta */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <span className="font-black text-emerald-900 text-xs block">
                  Precios de Venta al Cliente (PVP)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-emerald-900 block mb-1">Venta Mayor ($)</label>
                    <input
                      type="text"
                      value={variantEditForm.precioMayorUsd}
                      onChange={(e) => setVariantEditForm({ ...variantEditForm, precioMayorUsd: e.target.value })}
                      placeholder="Ej: 31.57"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-emerald-300 font-extrabold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-emerald-900 block mb-1">Venta Gran Mayor ($)</label>
                    <input
                      type="text"
                      value={variantEditForm.precioGranMayorUsd}
                      onChange={(e) => setVariantEditForm({ ...variantEditForm, precioGranMayorUsd: e.target.value })}
                      placeholder="Ej: 99.47"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-emerald-300 font-extrabold text-brand"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingVariantItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveVariantEdit}
                disabled={savingVariantEdit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingVariantEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Nuevo Producto Completo en la Matriz */}
      {showCreateMatrixModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand" />
                  <span>Nuevo Producto en Matriz Maestra</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registra el modelo con todos sus SKUs de color. Nacerá como <strong>Borrador</strong> para que lo publiques a la web cuando desees.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateMatrixModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProductMatrix} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre del Producto / Publicación *</label>
                  <input
                    type="text"
                    required
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    placeholder="Ej: Molde Navideño para Torta Negra 500g"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Categoría</label>
                  <input
                    type="text"
                    value={createForm.categoria}
                    onChange={(e) => setCreateForm({ ...createForm, categoria: e.target.value })}
                    placeholder="Ej: Moldes, Vasos, Cajas..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción / Ficha Breve</label>
                <textarea
                  rows={2}
                  value={createForm.descripcion}
                  onChange={(e) => setCreateForm({ ...createForm, descripcion: e.target.value })}
                  placeholder="Detalles técnicos, medidas, material..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              {/* Sección de Variantes (Colores / SKUs) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-brand" />
                    <span>Variantes de Color / SKUs del Producto ({createForm.variantes.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddCreateVariantRow}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-black text-brand bg-brand-50 border border-brand-200 hover:bg-brand-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Color / SKU</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {createForm.variantes.map((v, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 text-xs">
                          Variante #{idx + 1}
                        </span>
                        {createForm.variantes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCreateVariantRow(idx)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-[10px]"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">SKU</label>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].sku = e.target.value;
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            placeholder="MOL-500-ROJ"
                            className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Color</label>
                          <input
                            type="text"
                            value={v.color}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].color = e.target.value;
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            placeholder="Rojo / Dorado"
                            className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Stock</label>
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].stock = Number(e.target.value);
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-black"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <label className="font-bold text-amber-900 block mb-0.5">Costo Mayor ($)</label>
                          <input
                            type="text"
                            value={v.costoMayorUsd}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].costoMayorUsd = e.target.value;
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            placeholder="22.00"
                            className="w-full h-8 px-2 rounded-lg bg-white border border-amber-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-amber-900 block mb-0.5">Cant Mayor (u)</label>
                          <input
                            type="number"
                            value={v.minMayor}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].minMayor = Number(e.target.value);
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            className="w-full h-8 px-2 rounded-lg bg-white border border-amber-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-emerald-900 block mb-0.5">PVP Mayor ($)</label>
                          <input
                            type="text"
                            value={v.precioMayorUsd}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].precioMayorUsd = e.target.value;
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            placeholder="31.57"
                            className="w-full h-8 px-2 rounded-lg bg-white border border-emerald-300 font-black text-emerald-900"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-brand block mb-0.5">PVP Gran Mayor ($)</label>
                          <input
                            type="text"
                            value={v.precioGranMayorUsd}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].precioGranMayorUsd = e.target.value;
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            placeholder="99.47"
                            className="w-full h-8 px-2 rounded-lg bg-white border border-emerald-300 font-black text-brand"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateMatrixModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewProduct}
                  className="px-5 py-2.5 rounded-xl font-black text-white bg-brand hover:bg-brand-hover shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingNewProduct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando en Matriz...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Registrar en Matriz</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

