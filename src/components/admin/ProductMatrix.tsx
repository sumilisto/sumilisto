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
  AlertTriangle, Check, ExternalLink, HelpCircle, ArrowRight,
  Trash2, Settings
} from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";

interface ProductMatrixProps {
  products: Product[];
  onRefresh: () => void;
  onOpenAddModalWithData?: (prefill: Partial<Product>) => void;
  onOpenEditProduct?: (product: Product) => void;
  onOpenMediaModal?: (product: Product) => void;
  onOpenVariantModal?: (product: Product) => void;
}

// Obtiene el porcentaje de ganancia a partir de un string de factor o porcentaje
function getMarginPctFromFactor(factorStr: string): number | null {
  const clean = String(factorStr).replace("%", "").replace(",", ".").trim();
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return null;
  if (num >= 1 && num < 100) return Math.round(num);
  if (num > 0 && num < 1) return Math.round((1 - num) * 100);
  return null;
}

// Calcula el PVP dividiendo el Costo entre el Factor Divisor o según el % de ganancia
function computePvpFromFactor(costStr: string, factorStr: string): string {
  const cost = parseFloat(String(costStr).replace(",", "."));
  if (isNaN(cost) || cost <= 0) return "";

  const clean = String(factorStr).replace("%", "").replace(",", ".").trim();
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return "";

  // Caso 1: Ingreso como porcentaje de ganancia directo (ej. 20 -> 20% ganancia, divisor 0.80; 15 -> 15% ganancia, divisor 0.85)
  if (num >= 1 && num < 100) {
    const divisor = (100 - num) / 100;
    return (cost / divisor).toFixed(2);
  }

  // Caso 2: Ingreso como factor divisor decimal directo (ej. 0.80 -> 20% ganancia; 0.85 -> 15% ganancia; 0.70 -> 30% ganancia)
  if (num > 0 && num < 1) {
    return (cost / num).toFixed(2);
  }

  return "";
}

export const ProductMatrix: React.FC<ProductMatrixProps> = ({
  products,
  onRefresh,
  onOpenAddModalWithData,
  onOpenEditProduct,
  onOpenMediaModal,
  onOpenVariantModal,
}) => {
  const { theme, updateTheme } = useTheme();

  // Estados de Filtro y Búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | "publicados" | "pendientes" | "bajo_stock">("todos");

  // Estados de Gestión de Categorías
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState(false);
  const [modalNewCategoryInput, setModalNewCategoryInput] = useState("");

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
    unidadVenta: "",
    variantes: [
      {
        sku: "",
        color: "",
        presentacion: "",
        stock: "" as any,
        costoMayorUsd: "",
        minMayor: "" as any,
        factorMayor: "",
        costoGranMayorUsd: "",
        minGranMayor: "" as any,
        factorGranMayor: "",
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
    stock: "" as any,
    costoMayorUsd: "",
    minMayor: "" as any,
    factorMayor: "",
    costoGranMayorUsd: "",
    minGranMayor: "" as any,
    factorGranMayor: "",
    precioMayorUsd: "",
    precioGranMayorUsd: "",
    activo: true,
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

  // Toggle directo de disponibilidad de variante (activo = true/false -> Disponible vs Agotado)
  const toggleVariantStatus = async (variant: ProductVariant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!variant.id) return;

    const nextState = variant.activo === false ? true : false;
    try {
      const res = await fetch(`/api/variants/${variant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nextState }),
      });

      if (!res.ok) throw new Error("Error al cambiar disponibilidad");

      showToast(
        nextState
          ? `¡Variante "${variant.color || variant.sku}" marcada como DISPONIBLE!`
          : `Variante "${variant.color || variant.sku}" marcada como AGOTADA en la web`,
        nextState ? "success" : "error"
      );
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Error al actualizar disponibilidad de variante", "error");
    }
  };

  // Categorías disponibles configuradas en el sistema
  const DEFAULT_CATEGORIES = useMemo(() => ["Envases", "Bolsas", "Cubiertos", "Papel"], []);
  const availableCategories = useMemo(() => {
    const deleted = new Set((theme?.deletedCategories || []).map((c) => c.toLowerCase()));
    const cats = new Set<string>();

    DEFAULT_CATEGORIES.forEach((c) => {
      if (!deleted.has(c.toLowerCase())) cats.add(c);
    });

    (theme?.customCategories || []).forEach((c) => {
      if (c && !deleted.has(c.toLowerCase())) cats.add(c);
    });

    products.forEach((p) => {
      if (p.categoria) {
        p.categoria.split(",").forEach((raw) => {
          const clean = raw.trim();
          if (clean && !deleted.has(clean.toLowerCase())) {
            cats.add(clean);
          }
        });
      }
    });

    return Array.from(cats).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [DEFAULT_CATEGORIES, theme?.deletedCategories, theme?.customCategories, products]);

  // Usar categorías activas para el filtro principal
  const categories = availableCategories;

  // Guardar nueva categoría inline
  const handleSaveNewCategory = async () => {
    const clean = newCategoryInput.trim();
    if (!clean) return;

    const exists = availableCategories.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (exists) {
      setCreateForm((prev) => ({ ...prev, categoria: clean }));
      setIsAddingCategory(false);
      setNewCategoryInput("");
      showToast(`Categoría "${clean}" seleccionada`);
      return;
    }

    try {
      const currentCustom = theme?.customCategories || [];
      const updatedCustom = Array.from(new Set([...currentCustom, clean]));
      const currentDeleted = theme?.deletedCategories || [];
      const updatedDeleted = currentDeleted.filter((c) => c.toLowerCase() !== clean.toLowerCase());

      await updateTheme({
        customCategories: updatedCustom,
        deletedCategories: updatedDeleted,
      });

      setCreateForm((prev) => ({ ...prev, categoria: clean }));
      setIsAddingCategory(false);
      setNewCategoryInput("");
      showToast(`Categoría "${clean}" creada y seleccionada con éxito`);
    } catch (err: any) {
      showToast(err.message || "Error al crear categoría", "error");
    }
  };

  // Guardar nueva categoría desde el modal de gestión
  const handleSaveModalCategory = async () => {
    const clean = modalNewCategoryInput.trim();
    if (!clean) return;

    const exists = availableCategories.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (exists) {
      showToast(`La categoría "${clean}" ya existe`, "error");
      return;
    }

    try {
      const currentCustom = theme?.customCategories || [];
      const updatedCustom = Array.from(new Set([...currentCustom, clean]));
      const currentDeleted = theme?.deletedCategories || [];
      const updatedDeleted = currentDeleted.filter((c) => c.toLowerCase() !== clean.toLowerCase());

      await updateTheme({
        customCategories: updatedCustom,
        deletedCategories: updatedDeleted,
      });

      setModalNewCategoryInput("");
      showToast(`Categoría "${clean}" agregada con éxito`);
    } catch (err: any) {
      showToast(err.message || "Error al crear categoría", "error");
    }
  };

  // Eliminar categoría globalmente
  const handleDeleteCategory = async (catToDelete: string) => {
    if (!catToDelete) return;

    const affected = products.filter((p) =>
      (p.categoria || "")
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .includes(catToDelete.toLowerCase())
    );

    const confirmMsg =
      affected.length > 0
        ? `¿Eliminar la categoría "${catToDelete}"? Está presente en ${affected.length} producto(s). Se removerá de ellos automáticamente.`
        : `¿Estás seguro de eliminar la categoría "${catToDelete}" del catálogo?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      for (const p of affected) {
        const remaining = (p.categoria || "")
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c.toLowerCase() !== catToDelete.toLowerCase());
        const newCatString = remaining.length > 0 ? remaining.join(", ") : "General";

        await fetch(`/api/products/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: p.nombre,
            categoria: newCatString,
          }),
        });
      }

      const currentDeleted = theme?.deletedCategories || [];
      const updatedDeleted = Array.from(new Set([...currentDeleted, catToDelete]));
      const updatedCustom = (theme?.customCategories || []).filter(
        (c) => c.toLowerCase() !== catToDelete.toLowerCase()
      );

      await updateTheme({
        deletedCategories: updatedDeleted,
        customCategories: updatedCustom,
      });

      // Si la categoría eliminada estaba seleccionada en el formulario de creación, cambiar a otra
      if (createForm.categoria.toLowerCase() === catToDelete.toLowerCase()) {
        const remainingCats = availableCategories.filter(
          (c) => c.toLowerCase() !== catToDelete.toLowerCase()
        );
        setCreateForm((prev) => ({
          ...prev,
          categoria: remainingCats[0] || "General",
        }));
      }

      if (selectedCategory.toLowerCase() === catToDelete.toLowerCase()) {
        setSelectedCategory("todas");
      }

      onRefresh();
      showToast(`Categoría "${catToDelete}" eliminada correctamente`, "success");
    } catch (err: any) {
      showToast(err.message || "Error al eliminar categoría", "error");
    }
  };

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

    const cM = variant.costoMayorUsd !== undefined && variant.costoMayorUsd !== null ? Number(variant.costoMayorUsd) : 0;
    const pM = variant.precioMayorUsd !== undefined && variant.precioMayorUsd !== null ? Number(variant.precioMayorUsd) : 0;
    const initFactorM = pM > 0 && cM > 0 ? (cM / pM).toFixed(2) : "";

    const cGM = variant.costoGranMayorUsd !== undefined && variant.costoGranMayorUsd !== null ? Number(variant.costoGranMayorUsd) : 0;
    const pGM = variant.precioGranMayorUsd !== undefined && variant.precioGranMayorUsd !== null ? Number(variant.precioGranMayorUsd) : 0;
    const initFactorGM = pGM > 0 && cGM > 0 ? (cGM / pGM).toFixed(2) : "";

    setVariantEditForm({
      sku: variant.sku || "",
      color: variant.color || "",
      presentacion: variant.presentacion || "",
      stock: variant.stock !== undefined && variant.stock !== null ? variant.stock : ("" as any),
      costoMayorUsd: variant.costoMayorUsd !== undefined && variant.costoMayorUsd !== null ? String(variant.costoMayorUsd) : "",
      minMayor: variant.minMayor !== undefined && variant.minMayor !== null && variant.minMayor > 0 ? variant.minMayor : ("" as any),
      factorMayor: initFactorM,
      costoGranMayorUsd: variant.costoGranMayorUsd !== undefined && variant.costoGranMayorUsd !== null ? String(variant.costoGranMayorUsd) : "",
      minGranMayor: variant.minGranMayor !== undefined && variant.minGranMayor !== null && variant.minGranMayor > 0 ? variant.minGranMayor : ("" as any),
      factorGranMayor: initFactorGM,
      precioMayorUsd: variant.precioMayorUsd !== undefined && variant.precioMayorUsd !== null ? String(variant.precioMayorUsd) : "",
      precioGranMayorUsd: variant.precioGranMayorUsd !== undefined && variant.precioGranMayorUsd !== null ? String(variant.precioGranMayorUsd) : "",
      activo: variant.activo !== false,
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
        activo: variantEditForm.activo,
      };

      const res = await fetch(`/api/variants/${editingVariantItem.variant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Tu sesión expiró. Inicia sesión en otra pestaña y vuelve a intentar.");
        }
        throw new Error("Error al guardar cambios de variante");
      }

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
          presentacion: prev.unidadVenta || "",
          stock: "" as any,
          costoMayorUsd: "",
          minMayor: "" as any,
          factorMayor: "",
          costoGranMayorUsd: "",
          minGranMayor: "" as any,
          factorGranMayor: "",
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

    // Verificar si hay SKUs duplicados en las variantes ingresadas
    const enteredSkus = createForm.variantes.map((v) => v.sku.trim().toUpperCase()).filter(Boolean);
    const dupSku = enteredSkus.find((sku, idx) => enteredSkus.indexOf(sku) !== idx);
    if (dupSku) {
      showToast(
        `El SKU "${dupSku}" está repetido en más de una variante. Cada variante debe tener un SKU único diferente.`,
        "error"
      );
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
        unidad_venta: createForm.unidadVenta || "Unidad",
        activo: false, // Nace en la Matriz como pendiente por publicar
        destacado: false,
        variantes: createForm.variantes.map((v, i) => ({
          sku: v.sku.trim() || `${mainSku}-VAR${i + 1}`,
          color: v.color.trim() || "Estándar",
          presentacion: v.presentacion.trim() || createForm.unidadVenta || "Unidad",
          stock: Number(v.stock) || 0,
          costo_mayor_usd: v.costoMayorUsd ? Number(v.costoMayorUsd) : null,
          min_mayor: v.minMayor !== "" && !isNaN(Number(v.minMayor)) ? Number(v.minMayor) : 1,
          costo_gran_mayor_usd: v.costoGranMayorUsd ? Number(v.costoGranMayorUsd) : null,
          min_gran_mayor: v.minGranMayor !== "" && !isNaN(Number(v.minGranMayor)) ? Number(v.minGranMayor) : 0,
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
        if (res.status === 401) {
          throw new Error("Tu sesión expiró. Inicia sesión en otra pestaña del navegador y luego pulsa de nuevo 'Registrar en Matriz' sin recargar esta página (no perderás lo que escribiste).");
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al crear producto");
      }

      showToast(`¡Producto registrado en la Matriz! (Listo para publicar cuando desees)`);
      setShowCreateMatrixModal(false);
      setCreateForm({
        nombre: "",
        categoria: availableCategories[0] || "Envases",
        descripcion: "",
        unidadVenta: "",
        variantes: [
          {
            sku: "",
            color: "",
            presentacion: "",
            stock: "" as any,
            costoMayorUsd: "",
            minMayor: "" as any,
            factorMayor: "",
            costoGranMayorUsd: "",
            minGranMayor: "" as any,
            factorGranMayor: "",
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
            onClick={() => {
              setCreateForm({
                nombre: "",
                categoria: availableCategories[0] || "Envases",
                descripcion: "",
                unidadVenta: "",
                variantes: [
                  {
                    sku: "",
                    color: "",
                    presentacion: "",
                    stock: "" as any,
                    costoMayorUsd: "",
                    minMayor: "" as any,
                    factorMayor: "",
                    costoGranMayorUsd: "",
                    minGranMayor: "" as any,
                    factorGranMayor: "",
                    precioMayorUsd: "",
                    precioGranMayorUsd: "",
                  },
                ],
              });
              setIsAddingCategory(false);
              setShowCreateMatrixModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo en Matriz</span>
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
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2 w-8 text-center">Exp</th>
                <th className="py-2.5 px-2 sm:px-3">Producto / Publicación</th>
                <th className="py-2.5 px-2 text-center">Categoría</th>
                <th className="py-2.5 px-2 text-center">Variantes</th>
                <th className="py-2.5 px-2 text-right">Stock</th>
                <th className="py-2.5 px-2.5 text-right">Venta Mayor</th>
                <th className="py-2.5 px-2.5 text-right">Venta G. Mayor</th>
                <th className="py-2.5 px-2 text-center">Estado Web</th>
                <th className="py-2.5 px-2 text-center">Acciones</th>
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
                        <td className="py-2.5 px-2 text-center">
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
                        <td className="py-2.5 px-2 sm:px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
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
                            <div className="min-w-0 flex-1">
                              <span
                                className="font-extrabold text-slate-900 block truncate text-xs sm:text-sm"
                                title={product.nombre}
                              >
                                {product.nombre}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono truncate">
                                SKU Base: {product.sku}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                            {product.categoria}
                          </span>
                        </td>

                        {/* Cantidad de Variantes / SKUs */}
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${variants.length > 1
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : "bg-slate-100 text-slate-700"
                            }`}>
                            <Palette className="w-2.5 h-2.5" />
                            <span>{variants.length} SKU{variants.length !== 1 ? "s" : ""}</span>
                          </span>
                        </td>

                        {/* Stock Total */}
                        <td className="py-2.5 px-2 text-right">
                          <span className={`font-black text-xs ${isLowStock ? "text-rose-600" : "text-slate-800"
                            }`}>
                            {(product.stock || 0).toLocaleString("es-VE")}
                          </span>
                          <span className="text-[9px] text-slate-400 block -mt-0.5">unidades</span>
                        </td>

                        {/* Precios de Venta */}
                        <td className="py-2.5 px-2.5 text-right">
                          <span className="font-extrabold text-emerald-800 block text-xs">
                            {product.precioMayorUsd ? formatUsd(product.precioMayorUsd) : "$0,00"}
                          </span>
                          <span className="text-[9px] text-slate-400 block -mt-0.5">
                            x {product.minMayor || 50} u.
                          </span>
                        </td>

                        <td className="py-2.5 px-2.5 text-right">
                          <span className="font-extrabold text-brand block text-xs">
                            {product.precioGranMayorUsd ? formatUsd(product.precioGranMayorUsd) : "$0,00"}
                          </span>
                          <span className="text-[9px] text-slate-400 block -mt-0.5">
                            x {product.minGranMayor || 200} u.
                          </span>
                        </td>

                        {/* Estado Web: Switch / Toggle */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => togglePublication(product, e)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black transition-all ${product.activo
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
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
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

                              <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-black uppercase text-[9px] tracking-wider">
                                      <th className="py-2.5 px-2">Variante / Color</th>
                                      <th className="py-2.5 px-2 font-mono">SKU Único</th>
                                      <th className="py-2.5 px-2 text-right">Stock</th>
                                      <th className="py-2.5 px-2 text-right text-amber-900 bg-amber-50/50">Costo M</th>
                                      <th className="py-2.5 px-1.5 text-center text-amber-900 bg-amber-50/50">Cant. M</th>
                                      <th className="py-2.5 px-2 text-right text-amber-900 bg-amber-50/50">Costo GM</th>
                                      <th className="py-2.5 px-1.5 text-center text-amber-900 bg-amber-50/50">Cant. GM</th>
                                      <th className="py-2.5 px-2 text-right text-emerald-900 bg-emerald-50/40">PVP M</th>
                                      <th className="py-2.5 px-2 text-right text-emerald-900 bg-emerald-50/40">PVP GM</th>
                                      <th className="py-2.5 px-2 text-center text-indigo-900">Margen</th>
                                      <th className="py-2.5 px-2 text-center">Estado Web</th>
                                      <th className="py-2.5 px-2 text-center">Acción</th>
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

                                      const costGM = variant.costoGranMayorUsd || 0;
                                      const sellGM = variant.precioGranMayorUsd || 0;
                                      const marginPctGM = sellGM > 0 && costGM > 0
                                        ? Math.round(((sellGM - costGM) / sellGM) * 100)
                                        : 0;

                                      return (
                                        <tr key={variant.id || variant.sku} className="hover:bg-slate-50/80 transition-colors">
                                          {/* Color */}
                                          <td className="py-2 px-2 font-bold text-slate-800">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                                              <span>{variant.color || "Estándar"}</span>
                                            </div>
                                          </td>

                                          {/* SKU */}
                                          <td className="py-2 px-2 font-mono text-slate-600 font-semibold">
                                            {variant.sku}
                                          </td>

                                          {/* Stock */}
                                          <td className="py-2 px-2 text-right font-black">
                                            <span className={(variant.stock || 0) < 50 ? "text-rose-600" : "text-slate-800"}>
                                              {variant.stock || 0}
                                            </span>
                                          </td>

                                          {/* Costo Mayor */}
                                          <td className="py-2 px-2 text-right font-bold text-amber-950 bg-amber-50/30">
                                            {variant.costoMayorUsd !== undefined && variant.costoMayorUsd > 0
                                              ? formatUsd(variant.costoMayorUsd)
                                              : <span className="text-slate-300 italic">No asignado</span>}
                                          </td>

                                          {/* Cant. Mayor */}
                                          <td className="py-2 px-1.5 text-center text-slate-600 bg-amber-50/30">
                                            {variant.minMayor || 50} u.
                                          </td>

                                          {/* Costo Gran Mayor */}
                                          <td className="py-2 px-2 text-right font-bold text-amber-950 bg-amber-50/30">
                                            {variant.costoGranMayorUsd !== undefined && variant.costoGranMayorUsd > 0
                                              ? formatUsd(variant.costoGranMayorUsd)
                                              : <span className="text-slate-300 italic">No asignado</span>}
                                          </td>

                                          {/* Cant. Gran Mayor */}
                                          <td className="py-2 px-1.5 text-center text-slate-600 bg-amber-50/30">
                                            {variant.minGranMayor || 200} u.
                                          </td>

                                          {/* PVP Mayor */}
                                          <td className="py-2 px-2 text-right font-extrabold text-emerald-800 bg-emerald-50/30">
                                            {variant.precioMayorUsd ? formatUsd(variant.precioMayorUsd) : "$0,00"}
                                          </td>

                                          {/* PVP Gran Mayor */}
                                          <td className="py-2 px-2 text-right font-extrabold text-brand bg-emerald-50/30">
                                            {variant.precioGranMayorUsd ? formatUsd(variant.precioGranMayorUsd) : "$0,00"}
                                          </td>

                                          {/* Margen Mayor */}
                                          <td className="py-2 px-2 text-center">
                                            {marginPctM > 0 ? (
                                              <div className="inline-flex flex-col items-center gap-0.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-black text-[10px] shadow-2xs ${
                                                  marginPctM >= 25
                                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                                    : marginPctM >= 20
                                                      ? "bg-teal-100 text-teal-900 border border-teal-300"
                                                      : marginPctM >= 15
                                                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                                                        : "bg-amber-100 text-amber-900 border border-amber-300"
                                                }`}>
                                                  +{marginPctM}%
                                                </span>
                                                {marginPctGM > 0 && (
                                                  <span className="text-[9px] font-bold text-slate-500" title={`Margen Gran Mayor: +${marginPctGM}%`}>
                                                    GM: +{marginPctGM}%
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-slate-300">—</span>
                                            )}
                                          </td>

                                          {/* Estado Web Disponibilidad */}
                                          <td className="py-2 px-2 text-center">
                                            <button
                                              type="button"
                                              onClick={(e) => toggleVariantStatus(variant, e)}
                                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                                                variant.activo !== false
                                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                                                  : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300"
                                              }`}
                                              title={variant.activo !== false ? "Clic para marcar como AGOTADO en la tienda" : "Clic para marcar como DISPONIBLE"}
                                            >
                                              <span className={`w-1.5 h-1.5 rounded-full ${variant.activo !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                              <span>{variant.activo !== false ? "Disponible" : "Agotado"}</span>
                                            </button>
                                          </td>

                                          {/* Botón Edición Rápida */}
                                          <td className="py-2 px-2 text-center">
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

              {/* Bloque de Costos y Factores de Ganancia */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-900 text-xs flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Estructura de Costos &amp; Factor de Ganancia
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md">
                    Fórmula: Costo ÷ Factor = PVP
                  </span>
                </div>

                {/* Fila Mayor */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-extrabold text-[11px] text-amber-950 uppercase tracking-wide">
                      1. Venta al Mayor
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-amber-800 font-bold mr-0.5">Margen:</span>
                      {[15, 20, 25, 30, 35].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const factor = ((100 - pct) / 100).toFixed(2);
                            const auto = computePvpFromFactor(variantEditForm.costoMayorUsd, factor);
                            setVariantEditForm({
                              ...variantEditForm,
                              factorMayor: factor,
                              precioMayorUsd: auto || variantEditForm.precioMayorUsd,
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all ${
                            getMarginPctFromFactor(variantEditForm.factorMayor || "") === pct
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="font-bold text-amber-900 block mb-1">Costo Mayor ($)</label>
                      <input
                        type="text"
                        value={variantEditForm.costoMayorUsd}
                        onChange={(e) => {
                          const newCost = e.target.value;
                          const auto = computePvpFromFactor(newCost, variantEditForm.factorMayor || "0.70");
                          setVariantEditForm({
                            ...variantEditForm,
                            costoMayorUsd: newCost,
                            precioMayorUsd: auto || variantEditForm.precioMayorUsd,
                          });
                        }}
                        placeholder="Ej: 22.00"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-amber-900">Factor / % Mayor</label>
                        <span className="text-[10px] text-emerald-800 font-bold">
                          {(() => {
                            const pct = getMarginPctFromFactor(variantEditForm.factorMayor || "");
                            return pct !== null ? `${pct}% ganancia` : "÷ factor o %";
                          })()}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={variantEditForm.factorMayor || ""}
                        onChange={(e) => {
                          const newFactor = e.target.value;
                          const auto = computePvpFromFactor(variantEditForm.costoMayorUsd, newFactor);
                          setVariantEditForm({
                            ...variantEditForm,
                            factorMayor: newFactor,
                            precioMayorUsd: auto || variantEditForm.precioMayorUsd,
                          });
                        }}
                        placeholder="0.80 o 20"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-amber-900 block mb-1">Cant. Mayor (Unds)</label>
                      <input
                        type="number"
                        value={variantEditForm.minMayor !== undefined && variantEditForm.minMayor !== "" ? variantEditForm.minMayor : ""}
                        onChange={(e) => setVariantEditForm({ ...variantEditForm, minMayor: e.target.value === "" ? "" : Number(e.target.value) })}
                        placeholder="Ej: 50"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Fila Gran Mayor */}
                <div className="space-y-1.5 pt-2 border-t border-amber-200/70">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-extrabold text-[11px] text-amber-950 uppercase tracking-wide">
                      2. Gran Mayor (Volumen)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-amber-800 font-bold mr-0.5">Margen:</span>
                      {[10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const factor = ((100 - pct) / 100).toFixed(2);
                            const auto = computePvpFromFactor(variantEditForm.costoGranMayorUsd, factor);
                            setVariantEditForm({
                              ...variantEditForm,
                              factorGranMayor: factor,
                              precioGranMayorUsd: auto || variantEditForm.precioGranMayorUsd,
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all ${
                            getMarginPctFromFactor(variantEditForm.factorGranMayor || "") === pct
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="font-bold text-amber-900 block mb-1">Costo Gran Mayor ($)</label>
                      <input
                        type="text"
                        value={variantEditForm.costoGranMayorUsd}
                        onChange={(e) => {
                          const newCost = e.target.value;
                          const auto = computePvpFromFactor(newCost, variantEditForm.factorGranMayor || "0.80");
                          setVariantEditForm({
                            ...variantEditForm,
                            costoGranMayorUsd: newCost,
                            precioGranMayorUsd: auto || variantEditForm.precioGranMayorUsd,
                          });
                        }}
                        placeholder="Ej: 70.00"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-amber-900">Factor / % GM</label>
                        <span className="text-[10px] text-emerald-800 font-bold">
                          {(() => {
                            const pct = getMarginPctFromFactor(variantEditForm.factorGranMayor || "");
                            return pct !== null ? `${pct}% ganancia` : "÷ factor o %";
                          })()}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={variantEditForm.factorGranMayor || ""}
                        onChange={(e) => {
                          const newFactor = e.target.value;
                          const auto = computePvpFromFactor(variantEditForm.costoGranMayorUsd, newFactor);
                          setVariantEditForm({
                            ...variantEditForm,
                            factorGranMayor: newFactor,
                            precioGranMayorUsd: auto || variantEditForm.precioGranMayorUsd,
                          });
                        }}
                        placeholder="0.80 o 20"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-amber-900 block mb-1">Cant. Gran Mayor (Unds)</label>
                      <input
                        type="number"
                        value={variantEditForm.minGranMayor !== undefined && variantEditForm.minGranMayor !== "" ? variantEditForm.minGranMayor : ""}
                        onChange={(e) => setVariantEditForm({ ...variantEditForm, minGranMayor: e.target.value === "" ? "" : Number(e.target.value) })}
                        placeholder="Ej: 200"
                        className="w-full h-9 px-3 rounded-xl bg-white border border-amber-300 font-bold"
                      />
                    </div>
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
                      onChange={(e) => {
                        const newPvp = e.target.value;
                        const cost = parseFloat(String(variantEditForm.costoMayorUsd).replace(",", "."));
                        const pvp = parseFloat(String(newPvp).replace(",", "."));
                        let updatedFactor = variantEditForm.factorMayor;
                        if (!isNaN(cost) && cost > 0 && !isNaN(pvp) && pvp > 0) {
                          updatedFactor = (cost / pvp).toFixed(2);
                        }
                        setVariantEditForm({
                          ...variantEditForm,
                          precioMayorUsd: newPvp,
                          factorMayor: updatedFactor,
                        });
                      }}
                      placeholder="Ej: 31.57"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-emerald-300 font-extrabold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-emerald-900 block mb-1">Venta Gran Mayor ($)</label>
                    <input
                      type="text"
                      value={variantEditForm.precioGranMayorUsd}
                      onChange={(e) => {
                        const newPvp = e.target.value;
                        const cost = parseFloat(String(variantEditForm.costoGranMayorUsd).replace(",", "."));
                        const pvp = parseFloat(String(newPvp).replace(",", "."));
                        let updatedFactor = variantEditForm.factorGranMayor;
                        if (!isNaN(cost) && cost > 0 && !isNaN(pvp) && pvp > 0) {
                          updatedFactor = (cost / pvp).toFixed(2);
                        }
                        setVariantEditForm({
                          ...variantEditForm,
                          precioGranMayorUsd: newPvp,
                          factorGranMayor: updatedFactor,
                        });
                      }}
                      placeholder="Ej: 99.47"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-emerald-300 font-extrabold text-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque Disponibilidad en Tienda Web */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-black text-slate-800 text-xs block">
                  Disponibilidad en la Tienda Web
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVariantEditForm({ ...variantEditForm, activo: true })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      variantEditForm.activo
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>🟢 Disponible</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVariantEditForm({ ...variantEditForm, activo: false })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      !variantEditForm.activo
                        ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>🔴 Marcar como Agotado</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  {variantEditForm.activo
                    ? "Los clientes pueden ver este color y agregarlo al carrito normalmente."
                    : "Los clientes verán este color marcado como (Agotado) y no podrán comprarlo."}
                </p>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Categoría *</label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {!isAddingCategory ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCategory(true);
                              setNewCategoryInput("");
                            }}
                            className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline flex items-center gap-0.5"
                            title="Crear nueva categoría"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Nueva</span>
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setShowCategoryManagerModal(true)}
                            className="text-slate-500 hover:text-slate-700 font-semibold hover:underline flex items-center gap-0.5"
                            title="Gestionar y eliminar categorías"
                          >
                            <Settings className="w-3 h-3" />
                            <span>Gestionar</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {isAddingCategory ? (
                    <div className="flex items-center gap-1.5 animate-fadeIn">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveNewCategory();
                          } else if (e.key === "Escape") {
                            setIsAddingCategory(false);
                          }
                        }}
                        placeholder="Nueva categoría..."
                        className="flex-1 h-10 px-3 rounded-xl bg-white border-2 border-emerald-500 font-bold text-slate-800 focus:outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewCategory}
                        className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm transition-colors shrink-0 text-xs"
                        title="Guardar categoría"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Guardar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="h-10 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-colors shrink-0"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={createForm.categoria}
                        onChange={(e) => {
                          if (e.target.value === "__new__") {
                            setIsAddingCategory(true);
                            setNewCategoryInput("");
                          } else {
                            setCreateForm({ ...createForm, categoria: e.target.value });
                          }
                        }}
                        className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
                      >
                        {availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__new__" className="text-emerald-700 font-bold">
                          + Agregar nueva categoría...
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(createForm.categoria)}
                        disabled={availableCategories.length <= 1}
                        className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={`Eliminar categoría "${createForm.categoria}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                            value={v.stock !== undefined && v.stock !== "" ? v.stock : ""}
                            onChange={(e) => {
                              const updated = [...createForm.variantes];
                              updated[idx].stock = e.target.value === "" ? "" : Number(e.target.value);
                              setCreateForm({ ...createForm, variantes: updated });
                            }}
                            placeholder="0"
                            className="w-full h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-black"
                          />
                        </div>
                      </div>

                      {/* Bloque Escala Mayor */}
                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 mb-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider">
                            1. Escala Mayor (Lote Inicial)
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium">
                            Fórmula: Costo ÷ Factor = PVP (ej. $35 ÷ 0.70 = $50.00)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          <div>
                            <label className="font-bold text-slate-700 block mb-0.5">Costo Mayor ($)</label>
                            <input
                              type="text"
                              value={v.costoMayorUsd}
                              onChange={(e) => {
                                const newCost = e.target.value;
                                const updated = [...createForm.variantes];
                                updated[idx].costoMayorUsd = newCost;
                                const auto = computePvpFromFactor(newCost, updated[idx].factorMayor || "0.70");
                                if (auto) updated[idx].precioMayorUsd = auto;
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="35.00"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-amber-300 font-bold"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="font-bold text-slate-700">Factor / %</label>
                              <span className="text-[9px] text-emerald-800 font-bold">
                                {(() => {
                                  const pct = getMarginPctFromFactor(v.factorMayor || "");
                                  return pct !== null ? `${pct}% ganancia` : "÷ factor o %";
                                })()}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={v.factorMayor || ""}
                              onChange={(e) => {
                                const newFactor = e.target.value;
                                const updated = [...createForm.variantes];
                                updated[idx].factorMayor = newFactor;
                                const auto = computePvpFromFactor(updated[idx].costoMayorUsd, newFactor);
                                if (auto) updated[idx].precioMayorUsd = auto;
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="0.70 o 30"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-amber-300 font-bold text-center"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-0.5">Cant. Mínima Mayor (u)</label>
                            <input
                              type="number"
                              value={v.minMayor !== undefined && v.minMayor !== "" ? v.minMayor : ""}
                              onChange={(e) => {
                                const updated = [...createForm.variantes];
                                updated[idx].minMayor = e.target.value === "" ? "" : Number(e.target.value);
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="Ej: 50"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-amber-300 font-bold"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-emerald-900 block mb-0.5">PVP Venta Mayor ($)</label>
                            <input
                              type="text"
                              value={v.precioMayorUsd || ""}
                              onChange={(e) => {
                                const updated = [...createForm.variantes];
                                updated[idx].precioMayorUsd = e.target.value;
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="Ej: 50.00"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-emerald-300 font-black text-emerald-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bloque Escala Gran Mayor */}
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">
                            2. Escala Gran Mayor (Descuento por Volumen)
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium">
                            Fórmula: Costo ÷ Factor = PVP (ej. $80 ÷ 0.80 = $100.00)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          <div>
                            <label className="font-bold text-slate-700 block mb-0.5">Costo Gran Mayor ($)</label>
                            <input
                              type="text"
                              value={v.costoGranMayorUsd || ""}
                              onChange={(e) => {
                                const newCost = e.target.value;
                                const updated = [...createForm.variantes];
                                updated[idx].costoGranMayorUsd = newCost;
                                const auto = computePvpFromFactor(newCost, updated[idx].factorGranMayor || "0.80");
                                if (auto) updated[idx].precioGranMayorUsd = auto;
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="70.00"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-emerald-300 font-bold"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="font-bold text-slate-700">Factor / %</label>
                              <span className="text-[9px] text-emerald-800 font-bold">
                                {(() => {
                                  const pct = getMarginPctFromFactor(v.factorGranMayor || "");
                                  return pct !== null ? `${pct}% ganancia` : "÷ factor o %";
                                })()}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={v.factorGranMayor || ""}
                              onChange={(e) => {
                                const newFactor = e.target.value;
                                const updated = [...createForm.variantes];
                                updated[idx].factorGranMayor = newFactor;
                                const auto = computePvpFromFactor(updated[idx].costoGranMayorUsd, newFactor);
                                if (auto) updated[idx].precioGranMayorUsd = auto;
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="0.80 o 20"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-emerald-300 font-bold text-center"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-0.5">Cant. Mínima Gran Mayor (u)</label>
                            <input
                              type="number"
                              value={v.minGranMayor !== undefined && v.minGranMayor !== "" ? v.minGranMayor : ""}
                              onChange={(e) => {
                                const updated = [...createForm.variantes];
                                updated[idx].minGranMayor = e.target.value === "" ? "" : Number(e.target.value);
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="Ej: 200"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-emerald-300 font-bold"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-brand block mb-0.5">PVP Venta Gran Mayor ($)</label>
                            <input
                              type="text"
                              value={v.precioGranMayorUsd || ""}
                              onChange={(e) => {
                                const updated = [...createForm.variantes];
                                updated[idx].precioGranMayorUsd = e.target.value;
                                setCreateForm({ ...createForm, variantes: updated });
                              }}
                              placeholder="Ej: 99.47"
                              className="w-full h-8 px-2 rounded-lg bg-white border border-emerald-300 font-black text-brand"
                            />
                          </div>
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

      {/* 6. MODAL: Gestión y Eliminación de Categorías */}
      {showCategoryManagerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Gestionar Categorías</h3>
                  <p className="text-[11px] text-slate-500">Agrega o elimina categorías de tu catálogo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryManagerModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario Agregar Nueva Categoría */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Crear Nueva Categoría</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={modalNewCategoryInput}
                  onChange={(e) => setModalNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveModalCategory();
                    }
                  }}
                  placeholder="Ej: Repostería, Descartables..."
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={handleSaveModalCategory}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            {/* Lista de Categorías con conteo y eliminación */}
            <div className="p-4 overflow-y-auto space-y-1.5 flex-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Categorías Activas ({availableCategories.length})
              </span>
              {availableCategories.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No hay categorías activas.</p>
              ) : (
                availableCategories.map((cat) => {
                  const count = products.filter((p) =>
                    (p.categoria || "").toLowerCase().includes(cat.toLowerCase())
                  ).length;
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-800">{cat}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {count} {count === 1 ? "producto" : "productos"} vinculados
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="w-8 h-8 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 flex items-center justify-center transition-colors shadow-2xs"
                        title={`Eliminar categoría "${cat}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryManagerModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

