"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import { Product, ProductVariant, ProductPhoto } from "@/types/product";
import { formatUsd } from "@/lib/currency/format";
import { optimizeImage, validateVideoFile, formatFileSize } from "@/lib/utils/mediaOptimizer";
import {
  Package, Search, Plus, Upload, Trash2, Edit3, Check, AlertCircle,
  ExternalLink, LogOut, Lock, User, RefreshCw, Image as ImageIcon,
  CheckCircle2, ArrowLeft, Filter, Sparkles, X, ChevronRight, ChevronLeft,
  Video, Play, Star, Palette, Layers, Film, Calculator, ArrowRightLeft,
  Percent, DollarSign, Eye, ArrowUpDown, HelpCircle, Activity, Settings
} from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { useTheme } from "@/lib/theme/ThemeContext";

interface UploadPhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
  varianteColor?: string;
}

interface NewProductVariantItem {
  id: string;
  sku: string;
  color: string;
  presentacion: string;
  stock: string;
  precio_mayor_usd: string;
  min_mayor: string;
  precio_gran_mayor_usd: string;
  min_gran_mayor: string;
}

// Función auxiliar para calcular precios con Gestión Fiscal y Crédito Fiscal (Opción A):
// 1. Costo Base Imponible = si el costo ingresado ya incluye IVA, se extrae dividiendo entre 1.16; de lo contrario es el costo ingresado.
// 2. Crédito Fiscal = IVA 16% de compra (factura de proveedor) a favor del negocio.
// 3. Precio Neto = Costo Base / Factor Divisor de Margen (ej. 0.70 o 0.80).
// 4. Débito Fiscal = IVA 16% que se traslada al cliente en la venta (si withIvaVenta está activo).
// 5. IVA a enterar al SENIAT = Débito Fiscal - Crédito Fiscal.
// 6. Ganancia Neta Real en caja = Precio Neto - Costo Base.
function computePricing(
  costStr: string,
  costIncludesIva: boolean,
  withIvaVenta: boolean,
  mMayorStr: string,
  mGranStr: string,
  minMayorStr: string = "1",
  minGranMayorStr: string = "1",
  costGranStr: string = ""
) {
  const rawCostMayor = parseFloat(String(costStr).replace(",", "."));
  const rawCostGranInput = parseFloat(String(costGranStr).replace(",", "."));
  // Si se ingresó costo específico para Gran Mayor (>0), se usa ese. De lo contrario, se usa el de Mayor.
  const rawCostGran = (!isNaN(rawCostGranInput) && rawCostGranInput > 0) ? rawCostGranInput : rawCostMayor;
  const isCustomGranCost = (!isNaN(rawCostGranInput) && rawCostGranInput > 0);

  const minM = Math.max(1, parseFloat(String(minMayorStr).replace(",", ".")) || 1);
  const minGM = Math.max(1, parseFloat(String(minGranMayorStr).replace(",", ".")) || 1);

  if (isNaN(rawCostMayor) || rawCostMayor <= 0) {
    return {
      rawCost: 0,
      costBase: 0,
      costBaseMayor: 0,
      creditoFiscal: 0,
      creditoFiscalMayor: 0,
      costoCalculado: 0,
      costWithIva: 0,
      rawCostGran: 0,
      costBaseGran: 0,
      costBaseGranUnit: 0,
      creditoFiscalGran: 0,
      creditoFiscalGranUnit: 0,
      costBaseGranTotal: 0,
      costoBaseGranTotal: 0,
      creditoFiscalGranTotal: 0,
      isCustomGranCost: false,
      costIncludesIva,
      netoMayor: 0,
      ivaMayor: 0,
      ivaSeniatMayor: 0,
      pMayor: 0,
      netoGran: 0,
      netoGranUnit: 0,
      ivaGran: 0,
      ivaGranUnit: 0,
      pGran: 0,
      pGranUnit: 0,
      netoGranTotal: 0,
      ivaGranTotal: 0,
      ivaSeniatGran: 0,
      profitMayor: 0,
      profitGran: 0,
      factorMayor: 0.70,
      factorGran: 0.80,
      factorMayorStr: "0.70",
      factorGranStr: "0.80",
      minM,
      minGM,
      ratio: 1,
      savingsUnit: 0,
      savingsGranMayor: 0,
    };
  }

  // 1. Mayor: Extracción de Costo Base y Crédito Fiscal
  const costoBaseMayor = costIncludesIva ? rawCostMayor / 1.16 : rawCostMayor;
  const creditoFiscalMayor = costIncludesIva ? rawCostMayor - costoBaseMayor : costoBaseMayor * 0.16;

  // 2. Gran Mayor: Extracción de Costo Base y Crédito Fiscal (Totalmente independiente)
  const costoBaseGran = costIncludesIva ? rawCostGran / 1.16 : rawCostGran;
  const creditoFiscalGran = costIncludesIva ? rawCostGran - costoBaseGran : costoBaseGran * 0.16;

  const parseDivisor = (val: string, fallback: number) => {
    let n = parseFloat(String(val).replace(",", "."));
    if (isNaN(n) || n <= 0) return fallback;
    if (n > 1) {
      n = n / 100;
    }
    if (n <= 0 || n >= 1) return fallback;
    return n;
  };

  const factorMayor = parseDivisor(mMayorStr, 0.70);
  const factorGran = parseDivisor(mGranStr, 0.80);

  // 3. Precios netos antes de IVA (ambos por unidad / paquete base)
  const netoMayor = costoBaseMayor / factorMayor;
  const netoGran = costoBaseGran / factorGran;

  // 4. Débito Fiscal: IVA en la Venta
  const ivaMayor = withIvaVenta ? netoMayor * 0.16 : 0;
  const ivaGran = withIvaVenta ? netoGran * 0.16 : 0;

  // 5. Precios finales: unitarios e independientes
  const pMayor = Math.round((netoMayor + ivaMayor) * 100) / 100;
  const pGran = Math.round((netoGran + ivaGran) * 100) / 100;

  // 6. IVA a enterar al SENIAT (Débito Fiscal - Crédito Fiscal)
  const ivaSeniatMayor = Math.max(0, Math.round((ivaMayor - creditoFiscalMayor) * 100) / 100);
  const ivaSeniatGran = Math.max(0, Math.round((ivaGran - creditoFiscalGran) * 100) / 100);

  // 7. Ganancias netas reales
  const profitMayor = Math.round((netoMayor - costoBaseMayor) * 100) / 100;
  const profitGran = Math.round((netoGran - costoBaseGran) * 100) / 100;

  // 8. Ahorro para el cliente al comprar a Gran Mayor
  const regularEquivalent = minM > 0 ? (pMayor / minM) * minGM : pMayor;
  const savingsGranMayor = Math.max(0, Math.round((regularEquivalent - pGran) * 100) / 100);
  const savingsUnit = minGM > 0 ? Math.round((savingsGranMayor / minGM) * 100) / 100 : 0;

  return {
    rawCost: Math.round(rawCostMayor * 100) / 100,
    costBase: Math.round(costoBaseMayor * 100) / 100,
    costBaseMayor: Math.round(costoBaseMayor * 100) / 100,
    creditoFiscal: Math.round(creditoFiscalMayor * 100) / 100,
    creditoFiscalMayor: Math.round(creditoFiscalMayor * 100) / 100,
    costoCalculado: Math.round(costoBaseMayor * 100) / 100,
    costWithIva: Math.round((costoBaseMayor + creditoFiscalMayor) * 100) / 100,
    rawCostGran: Math.round(rawCostGran * 100) / 100,
    costBaseGran: Math.round(costoBaseGran * 100) / 100,
    costBaseGranUnit: Math.round(costoBaseGran * 100) / 100,
    costBaseGranTotal: Math.round(costoBaseGran * 100) / 100,
    costoBaseGranTotal: Math.round(costoBaseGran * 100) / 100,
    creditoFiscalGran: Math.round(creditoFiscalGran * 100) / 100,
    creditoFiscalGranUnit: Math.round(creditoFiscalGran * 100) / 100,
    creditoFiscalGranTotal: Math.round(creditoFiscalGran * 100) / 100,
    isCustomGranCost,
    costIncludesIva,
    netoMayor: Math.round(netoMayor * 100) / 100,
    ivaMayor: Math.round(ivaMayor * 100) / 100,
    ivaSeniatMayor,
    pMayor,
    netoGran: Math.round(netoGran * 100) / 100,
    netoGranUnit: Math.round(netoGran * 100) / 100,
    netoGranTotal: Math.round(netoGran * 100) / 100,
    ivaGran: Math.round(ivaGran * 100) / 100,
    ivaGranUnit: Math.round(ivaGran * 100) / 100,
    ivaGranTotal: Math.round(ivaGran * 100) / 100,
    pGran,
    pGranUnit: pGran,
    ivaSeniatGran,
    profitMayor,
    profitGran,
    factorMayor,
    factorGran,
    factorMayorStr: factorMayor.toFixed(2),
    factorGranStr: factorGran.toFixed(2),
    minM,
    minGM,
    ratio: 1,
    savingsUnit,
    savingsGranMayor,
  };
}

export default function AdminProductosPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [filterNoPhoto, setFilterNoPhoto] = useState(false);
  const [filterDestacados, setFilterDestacados] = useState(false);

  // Notificaciones flotantes
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Modal: Gestión Multimedia (Fotos y Video)
  const [mediaProduct, setMediaProduct] = useState<Product | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaStatusText, setMediaStatusText] = useState("");
  const [mediaActiveCarouselIdx, setMediaActiveCarouselIdx] = useState(0);
  const [mediaViewMode, setMediaViewMode] = useState<"grid" | "carousel">("grid");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Modal: Gestión de Variantes
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({
    color: "",
    sku: "",
    presentacion: "",
    stock: "100",
    precio_mayor_usd: "",
    min_mayor: "1",
    precio_gran_mayor_usd: "",
    min_gran_mayor: "5",
  });
  // Calculadora en Modal Variantes
  const [showVarCalc, setShowVarCalc] = useState(false);
  const [varCostBase, setVarCostBase] = useState("");
  const [varApplyIvaCompra, setVarApplyIvaCompra] = useState(false);
  const [varApplyIvaVenta, setVarApplyIvaVenta] = useState(true);
  const [varMarginMayor, setVarMarginMayor] = useState("0.70");
  const [varMarginGranMayor, setVarMarginGranMayor] = useState("0.80");

  // Modal: Agregar Producto Nuevo (Completo con Variantes y Fotos)
  const [showAddModal, setShowAddModal] = useState(false);
  const [createActiveTab, setCreateActiveTab] = useState<"general" | "variants" | "photos">("general");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const { theme, updateTheme } = useTheme();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isProcessingCategoryDelete, setIsProcessingCategoryDelete] = useState(false);
  const [newCategoryManagerInput, setNewCategoryManagerInput] = useState("");
  const [inlineNewCatInput, setInlineNewCatInput] = useState("");
  const [inlineEditCatInput, setInlineEditCatInput] = useState("");

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

    return Array.from(cats);
  }, [DEFAULT_CATEGORIES, theme?.deletedCategories, theme?.customCategories, products]);

  // Selección múltiple para Nuevo Producto
  const newProductSelectedCategories = useMemo(() => {
    return (newProduct?.categoria || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [newProduct?.categoria]);

  const handleToggleNewCategory = (cat: string) => {
    const current = (newProduct.categoria || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    let updated: string[];
    if (current.includes(cat)) {
      updated = current.filter((c) => c !== cat);
    } else {
      updated = [...current, cat];
    }
    setNewProduct({ ...newProduct, categoria: updated.join(", ") });
  };

  const handleRemoveNewCategory = (cat: string) => {
    const current = (newProduct.categoria || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const updated = current.filter((c) => c !== cat);
    setNewProduct({ ...newProduct, categoria: updated.join(", ") });
  };

  // Selección múltiple para Editar Producto
  const editProductSelectedCategories = useMemo(() => {
    return (editingProduct?.categoria || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [editingProduct?.categoria]);

  const handleToggleEditCategory = (cat: string) => {
    if (!editingProduct) return;
    const current = (editingProduct.categoria || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    let updated: string[];
    if (current.includes(cat)) {
      updated = current.filter((c) => c !== cat);
    } else {
      updated = [...current, cat];
    }
    setEditingProduct({ ...editingProduct, categoria: updated.join(", ") });
  };

  const handleRemoveEditCategory = (cat: string) => {
    if (!editingProduct) return;
    const current = (editingProduct.categoria || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const updated = current.filter((c) => c !== cat);
    setEditingProduct({ ...editingProduct, categoria: updated.join(", ") });
  };

  // Agregar categoría inline desde el modal de producto
  const handleAddInlineNewCategory = async (forEdit: boolean = false) => {
    const raw = forEdit ? inlineEditCatInput : inlineNewCatInput;
    const clean = raw.trim();
    if (!clean) return;

    const updatedDeleted = (theme?.deletedCategories || []).filter(
      (c) => c.toLowerCase() !== clean.toLowerCase()
    );
    const updatedCustom = Array.from(
      new Set([...(theme?.customCategories || []), clean])
    );

    try {
      await updateTheme({
        deletedCategories: updatedDeleted,
        customCategories: updatedCustom,
      });
    } catch {}

    if (forEdit && editingProduct) {
      const current = (editingProduct.categoria || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (!current.includes(clean)) {
        setEditingProduct({
          ...editingProduct,
          categoria: [...current, clean].join(", "),
        });
      }
      setInlineEditCatInput("");
    } else {
      const current = (newProduct.categoria || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (!current.includes(clean)) {
        setNewProduct({
          ...newProduct,
          categoria: [...current, clean].join(", "),
        });
      }
      setInlineNewCatInput("");
    }
    showToast(`Categoría "${clean}" agregada y vinculada`);
  };

  // Eliminar categoría globalmente
  const handleDeleteCategory = async (catToDelete: string) => {
    const affected = products.filter((p) =>
      (p.categoria || "")
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .includes(catToDelete.toLowerCase())
    );

    const confirmMsg =
      affected.length > 0
        ? `¿Eliminar la categoría "${catToDelete}"? Está presente en ${affected.length} producto(s). Se removerá automáticamente de dichos productos.`
        : `¿Eliminar la categoría "${catToDelete}" del catálogo?`;

    if (!window.confirm(confirmMsg)) return;

    setIsProcessingCategoryDelete(true);
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

      if (selectedCategory.toLowerCase() === catToDelete.toLowerCase()) {
        setSelectedCategory("todas");
      }

      await loadProducts();
      showToast(`Categoría "${catToDelete}" eliminada correctamente`, "success");
    } catch (err: any) {
      showToast(err.message || "Error al eliminar categoría", "error");
    } finally {
      setIsProcessingCategoryDelete(false);
    }
  };

  const [newProduct, setNewProduct] = useState({
    nombre: "",
    categoria: "Envases",
    unidad_venta: "Unidad",
    descripcion: "",
    activo: true,
    destacado: false,
  });

  // Lista de todos los SKUs para el nuevo producto
  const [newProductVariants, setNewProductVariants] = useState<NewProductVariantItem[]>([
    {
      id: "v-1",
      sku: "",
      color: "Estándar",
      presentacion: "Unidad",
      stock: "100",
      precio_mayor_usd: "",
      min_mayor: "1",
      precio_gran_mayor_usd: "",
      min_gran_mayor: "5",
    },
  ]);
  const [activeNewVariantIdx, setActiveNewVariantIdx] = useState(0);

  // Calculadora en Modal Nuevo Producto
  const [showAddCalc, setShowAddCalc] = useState(true);
  const [addCostBase, setAddCostBase] = useState("");
  const [addCostGranBase, setAddCostGranBase] = useState("");
  const [addApplyIvaCompra, setAddApplyIvaCompra] = useState(false);
  const [addApplyIvaVenta, setAddApplyIvaVenta] = useState(true);
  const [addMarginMayor, setAddMarginMayor] = useState("0.70");
  const [addMarginGranMayor, setAddMarginGranMayor] = useState("0.80");
  const [addMinMayor, setAddMinMayor] = useState("1");
  const [addMinGranMayor, setAddMinGranMayor] = useState("5");

  // Fotos interactivas del nuevo producto (previsualización, portada y orden)
  const [newProductPhotoItems, setNewProductPhotoItems] = useState<UploadPhotoItem[]>([]);
  const [newProductVideo, setNewProductVideo] = useState<File | null>(null);

  // Modal: Edición de Producto (Completa con Información General, Variantes/SKUs y Fotos)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editActiveTab, setEditActiveTab] = useState<"general" | "variants" | "photos">("general");
  const [savingEdit, setSavingEdit] = useState(false);

  // Formulario y calculadora para agregar/modificar SKU en Editar Producto
  const [isAddingEditVariant, setIsAddingEditVariant] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantForm, setEditVariantForm] = useState({
    sku: "",
    color: "",
    presentacion: "Unidad",
    stock: "100",
    precio_mayor_usd: "",
    min_mayor: "1",
    precio_gran_mayor_usd: "",
    min_gran_mayor: "5",
  });
  const [showEditVarCalc, setShowEditVarCalc] = useState(false);
  const [editVarCostBase, setEditVarCostBase] = useState("");
  const [editVarCostGranBase, setEditVarCostGranBase] = useState("");
  const [editVarApplyIvaCompra, setEditVarApplyIvaCompra] = useState(false);
  const [editVarApplyIvaVenta, setEditVarApplyIvaVenta] = useState(true);
  const [editVarMarginMayor, setEditVarMarginMayor] = useState("0.70");
  const [editVarMarginGranMayor, setEditVarMarginGranMayor] = useState("0.80");

  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) loadProducts();
    });
  }, []);

  // Bloquear scroll de la página de fondo cuando cualquier modal esté abierto (elimina la doble barra de desplazamiento)
  useEffect(() => {
    const isModalOpen = Boolean(showAddModal || variantProduct || mediaProduct || editingProduct);
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAddModal, variantProduct, mediaProduct, editingProduct]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        // Si hay modal abierto, refrescar su producto
        if (mediaProduct) {
          const fresh = data.find((p: Product) => p.id === mediaProduct.id);
          if (fresh) setMediaProduct(fresh);
        }
        if (variantProduct) {
          const fresh = data.find((p: Product) => p.id === variantProduct.id);
          if (fresh) setVariantProduct(fresh);
        }
        if (editingProduct) {
          const fresh = data.find((p: Product) => p.id === editingProduct.id);
          if (fresh) setEditingProduct(fresh);
        }
      }
    } catch {
      showToast("Error al cargar los productos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const res = await loginAdmin(usernameInput, passwordInput);
      if (res.ok) {
        setIsAuthenticated(true);
        loadProducts();
      } else {
        setAuthError(res.error || "Credenciales incorrectas");
      }
    } catch {
      setAuthError("Error de conexión");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  // ─────────────────────────────────────────────────────────
  // MULTIMEDIA: FOTOS (Optimización en cliente + hasta 10 fotos)
  // ─────────────────────────────────────────────────────────
  const handleUploadPhotos = async (productId: string, files: FileList | File[]) => {
    if (!productId || !files || files.length === 0) return;

    const prod = products.find((p) => p.id === productId);
    const existingCount = (prod?.fotos || []).filter((f) => !f.url.includes("placehold.co")).length;
    const availableSlots = 10 - existingCount;

    if (availableSlots <= 0) {
      showToast("Este producto ya tiene el máximo permitido de 10 fotos.", "error");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setIsProcessingMedia(true);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const originalFile = filesToUpload[i];
        setMediaStatusText(`Optimizando foto ${i + 1} de ${filesToUpload.length}...`);

        // Comprimir en cliente manteniendo nitidez (con fallback al archivo original si el formato o navegador no lo soporta)
        let fileToSend: File = originalFile;
        let savingsPercent = 0;
        try {
          const opt = await optimizeImage(originalFile, 1280, 0.85);
          fileToSend = opt.file;
          savingsPercent = opt.savingsPercent;
        } catch {
          fileToSend = originalFile;
        }

        setMediaStatusText(
          savingsPercent > 0
            ? `Subiendo foto ${i + 1} (${formatFileSize(fileToSend.size)}, ahorro ${savingsPercent}%)...`
            : `Subiendo foto ${i + 1} (${formatFileSize(fileToSend.size)})...`
        );

        const formData = new FormData();
        formData.append("file", fileToSend);
        formData.append("producto_id", productId);
        formData.append("alt", prod?.nombre || "Producto");
        formData.append("is_primary", existingCount === 0 && i === 0 ? "true" : "false");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Error al subir foto ${i + 1}`);
        }
      }

      showToast(`¡${filesToUpload.length} foto(s) subida(s) con éxito!`);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al procesar fotos", "error");
    } finally {
      setIsProcessingMedia(false);
      setMediaStatusText("");
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // Asignar variante de color a una foto (o marcar como General)
  const handleSetPhotoVariant = async (productId: string, fotoId: string, varianteColor: string) => {
    setIsProcessingMedia(true);
    setMediaStatusText("Guardando variante de la foto...");
    try {
      const formData = new FormData();
      formData.append("action", "set-variant");
      formData.append("foto_id", fotoId);
      formData.append("variante_color", varianteColor);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("No se pudo asignar la variante");

      showToast(varianteColor ? `Foto asignada a variante "${varianteColor}"` : "Foto marcada como General");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al asignar variante", "error");
    } finally {
      setIsProcessingMedia(false);
      setMediaStatusText("");
    }
  };

  // Marcar foto como Principal (Portada)
  const handleSetPrimaryPhoto = async (productId: string, fotoId: string) => {
    setIsProcessingMedia(true);
    setMediaStatusText("Actualizando foto de portada...");
    try {
      const formData = new FormData();
      formData.append("action", "set-primary");
      formData.append("producto_id", productId);
      formData.append("foto_id", fotoId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("No se pudo cambiar la foto principal");

      showToast("Foto principal actualizada");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al actualizar", "error");
    } finally {
      setIsProcessingMedia(false);
      setMediaStatusText("");
    }
  };

  // Reordenar foto existente (Mover antes / después)
  const handleMoveExistingPhoto = async (productId: string, fromIdx: number, toIdx: number, photosList?: ProductPhoto[]) => {
    const targetPhotos = photosList || (mediaProduct?.fotos || editingProduct?.fotos || []);
    const realPhotos = targetPhotos.filter((f) => !f.url.includes("placehold.co"));
    if (toIdx < 0 || toIdx >= realPhotos.length) return;

    const updated = [...realPhotos];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    // Actualizar orden numérico local
    if (mediaProduct && mediaProduct.id === productId) {
      setMediaProduct({ ...mediaProduct, fotos: updated });
    }
    if (editingProduct && editingProduct.id === productId) {
      setEditingProduct({ ...editingProduct, fotos: updated });
    }

    setIsProcessingMedia(true);
    setMediaStatusText("Guardando orden de las fotos...");
    try {
      const photoIds = updated.map((f) => f.publicId).filter(Boolean);
      const formData = new FormData();
      formData.append("action", "reorder");
      formData.append("photo_ids", JSON.stringify(photoIds));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al guardar el nuevo orden");
      showToast("Orden de fotos actualizado");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al reordenar fotos", "error");
    } finally {
      setIsProcessingMedia(false);
      setMediaStatusText("");
    }
  };

  // Eliminar foto individual
  const handleDeletePhoto = async (productId: string, fotoId: string, storageUrl: string) => {
    if (!confirm("¿Deseas eliminar esta foto del carrusel?")) return;

    setIsProcessingMedia(true);
    setMediaStatusText("Eliminando foto...");
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto_id: fotoId, storage_url: storageUrl }),
      });

      if (!res.ok) throw new Error("Error al eliminar foto");

      showToast("Foto eliminada correctamente");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al eliminar", "error");
    } finally {
      setIsProcessingMedia(false);
      setMediaStatusText("");
    }
  };

  // ─────────────────────────────────────────────────────────
  // MULTIMEDIA: VIDEO (1 por producto, validado < 30 MB)
  // ─────────────────────────────────────────────────────────
  const handleUploadVideo = async (productId: string, file: File) => {
    if (!productId || !file) return;

    const validation = validateVideoFile(file, 30);
    if (!validation.ok) {
      showToast(validation.error || "Video no válido", "error");
      return;
    }

    setIsProcessingMedia(true);
    setMediaStatusText(`Subiendo video (${formatFileSize(file.size)})...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("producto_id", productId);
      formData.append("type", "video");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al subir video");
      }

      showToast("¡Video del producto guardado con éxito!");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al subir video", "error");
    } finally {
      setIsProcessingMedia(false);
      setMediaStatusText("");
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleDeleteVideo = async (productId: string, videoUrl: string) => {
    if (!confirm("¿Deseas eliminar el video de este producto?")) return;

    setIsProcessingMedia(true);
    setMediaStatusText("Eliminando video...");
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "video", producto_id: productId, storage_url: videoUrl }),
      });

      if (!res.ok) throw new Error("Error al eliminar video");

      showToast("Video eliminado");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al eliminar video", "error");
    } finally {
      setIsProcessingMedia(false);
      setMediaStatusText("");
    }
  };

  // ─────────────────────────────────────────────────────────
  // GESTIÓN DE VARIANTES (Colores / Presentaciones)
  // ─────────────────────────────────────────────────────────
  const handleOpenVariantsModal = (prod: Product) => {
    setVariantProduct(prod);
    setIsAddingVariant(false);
    setEditingVariant(null);
    setVariantForm({
      color: "",
      sku: `${prod.sku}-VAR`,
      presentacion: prod.unidadVenta || "50 Und",
      stock: "100",
      precio_mayor_usd: prod.precioMayorUsd ? String(prod.precioMayorUsd) : "",
      min_mayor: String(prod.minMayor || 1),
      precio_gran_mayor_usd: prod.precioGranMayorUsd ? String(prod.precioGranMayorUsd) : "",
      min_gran_mayor: String(prod.minGranMayor || 5),
    });
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantProduct || !variantForm.color.trim() || !variantForm.sku.trim()) {
      showToast("Color/Nombre y SKU son obligatorios", "error");
      return;
    }

    setSavingVariant(true);
    try {
      if (editingVariant && editingVariant.id) {
        // Actualizar variante existente
        const res = await fetch(`/api/variants/${editingVariant.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variantForm),
        });
        if (!res.ok) throw new Error("Error al actualizar variante");
        showToast("Variante actualizada con éxito");
      } else {
        // Crear nueva variante
        const res = await fetch("/api/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto_id: variantProduct.id,
            ...variantForm,
          }),
        });
        if (!res.ok) throw new Error("Error al crear variante");
        showToast(`Variante ${variantForm.color} agregada`);
      }

      setIsAddingVariant(false);
      setEditingVariant(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al guardar variante", "error");
    } finally {
      setSavingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string, variantColor: string) => {
    if (!confirm(`¿Eliminar la variante "${variantColor}"?`)) return;

    try {
      const res = await fetch(`/api/variants/${variantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar variante");

      showToast("Variante eliminada");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al eliminar", "error");
    }
  };

  // ─────────────────────────────────────────────────────────
  // GESTIÓN DE FOTOS PARA NUEVO PRODUCTO (Preview, Portada y Orden)
  // ─────────────────────────────────────────────────────────
  const handleSelectNewPhotos = (eOrFiles: React.ChangeEvent<HTMLInputElement> | FileList | File[]) => {
    let files: File[] = [];
    if ("target" in eOrFiles) {
      if (eOrFiles.target.files) {
        files = Array.from(eOrFiles.target.files);
        eOrFiles.target.value = "";
      }
    } else {
      files = Array.from(eOrFiles);
    }
    const remaining = 10 - newProductPhotoItems.length;
    if (remaining <= 0) {
      showToast("Ya alcanzaste el límite máximo de 10 fotos.", "error");
      return;
    }
    const toAdd: UploadPhotoItem[] = files.slice(0, remaining).map((f, i) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      isPrimary: newProductPhotoItems.length === 0 && i === 0,
    }));
    setNewProductPhotoItems((prev) => [...prev, ...toAdd]);
  };

  const handleSetPrimaryNewPhoto = (id: string) => {
    setNewProductPhotoItems((prev) =>
      prev.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    );
  };

  const handleMoveNewPhoto = (index: number, direction: -1 | 1) => {
    setNewProductPhotoItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleRemoveNewPhoto = (id: string) => {
    setNewProductPhotoItems((prev) => {
      const itemToRemove = prev.find((p) => p.id === id);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      const filtered = prev.filter((p) => p.id !== id);
      if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  // ─────────────────────────────────────────────────────────
  // CREACIÓN DE PRODUCTO NUEVO (Con Múltiples SKUs y Fotos con Variante)
  // ─────────────────────────────────────────────────────────
  const handleAddNewProductVariant = () => {
    const nextIdx = newProductVariants.length + 1;
    const basePrefix = (newProduct.nombre || "PROD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 8)
      .toUpperCase();

    const newVar: NewProductVariantItem = {
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sku: `${basePrefix}-VAR${nextIdx}`,
      color: `Color ${nextIdx}`,
      presentacion: newProduct.unidad_venta || "Unidad",
      stock: "100",
      precio_mayor_usd: newProductVariants[0]?.precio_mayor_usd || "",
      min_mayor: newProductVariants[0]?.min_mayor || "1",
      precio_gran_mayor_usd: newProductVariants[0]?.precio_gran_mayor_usd || "",
      min_gran_mayor: newProductVariants[0]?.min_gran_mayor || "5",
    };
    setNewProductVariants((prev) => [...prev, newVar]);
    setActiveNewVariantIdx(newProductVariants.length);
    showToast(`Nuevo SKU agregado (#${nextIdx})`);
  };

  const handleRemoveNewProductVariant = (id: string) => {
    if (newProductVariants.length <= 1) {
      showToast("El producto debe tener al menos un SKU / Variante", "error");
      return;
    }
    setNewProductVariants((prev) => prev.filter((v) => v.id !== id));
    setActiveNewVariantIdx((prev) => Math.max(0, prev - 1));
  };

  const handleUpdateNewProductVariant = (id: string, field: keyof NewProductVariantItem, value: string) => {
    setNewProductVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.nombre.trim()) {
      showToast("El nombre del producto es obligatorio", "error");
      setCreateActiveTab("general");
      return;
    }

    if (newProductVariants.length === 0) {
      showToast("Debes ingresar al menos 1 SKU / Variante", "error");
      setCreateActiveTab("variants");
      return;
    }

    // Validar que cada SKU tenga precio mayor
    for (let i = 0; i < newProductVariants.length; i++) {
      const v = newProductVariants[i];
      if (!v.precio_mayor_usd || parseFloat(v.precio_mayor_usd) <= 0) {
        showToast(`El SKU #${i + 1} (${v.color || "Variante"}) debe tener un Precio al Mayor válido`, "error");
        setCreateActiveTab("variants");
        return;
      }
    }

    setCreatingProduct(true);
    try {
      const basePrefix = newProduct.nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 10)
        .toUpperCase();

      const finalVariants = newProductVariants.map((v, i) => {
        const sku = (v.sku.trim() || `${basePrefix}-${(v.color || `VAR${i + 1}`).substring(0, 4).toUpperCase()}`).trim();
        return {
          sku,
          color: v.color.trim() || "Estándar",
          presentacion: v.presentacion || newProduct.unidad_venta || "Unidad",
          stock: Number(v.stock) || 0,
          precio_mayor_usd: Number(v.precio_mayor_usd) || 0,
          min_mayor: Number(v.min_mayor) || 1,
          precio_gran_mayor_usd: Number(v.precio_gran_mayor_usd) || 0,
          min_gran_mayor: Number(v.min_gran_mayor) || 5,
        };
      });

      // Validar que no haya SKUs repetidos entre las variantes ingresadas
      const seenSkus = new Set<string>();
      for (let i = 0; i < finalVariants.length; i++) {
        const skuUpper = finalVariants[i].sku.toUpperCase();
        if (seenSkus.has(skuUpper)) {
          showToast(`El SKU "${finalVariants[i].sku}" está repetido. Cada variante debe tener un SKU único diferente (ej. DOY-ROJ-500, DOY-DOR-500).`, "error");
          setCreateActiveTab("variants");
          setCreatingProduct(false);
          return;
        }
        seenSkus.add(skuUpper);
      }

      // 1. Crear producto con sus variantes en Supabase
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newProduct.nombre.trim(),
          categoria: newProduct.categoria,
          unidad_venta: newProduct.unidad_venta,
          descripcion: newProduct.descripcion,
          activo: newProduct.activo,
          destacado: newProduct.destacado,
          sku: finalVariants[0].sku,
          variantes: finalVariants,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear producto");
      }

      const created = await res.json();

      // 2. Si adjuntó fotos, subirlas optimizadas en el orden exacto configurado y vinculadas a variante_color
      if (newProductPhotoItems.length > 0 && created.id) {
        for (let i = 0; i < newProductPhotoItems.length; i++) {
          const item = newProductPhotoItems[i];
          const opt = await optimizeImage(item.file, 1280, 0.85);
          const formData = new FormData();
          formData.append("file", opt.file);
          formData.append("producto_id", created.id);
          formData.append("alt", newProduct.nombre);
          formData.append("orden", String(i));
          formData.append("is_primary", item.isPrimary ? "true" : "false");
          if (item.varianteColor) {
            formData.append("variante_color", item.varianteColor);
          }
          await fetch("/api/upload", { method: "POST", body: formData });
        }
      }

      // 3. Si adjuntó video, subirlo
      if (newProductVideo && created.id) {
        const formData = new FormData();
        formData.append("file", newProductVideo);
        formData.append("producto_id", created.id);
        formData.append("type", "video");
        await fetch("/api/upload", { method: "POST", body: formData });
      }

      showToast(`¡Producto "${newProduct.nombre}" creado con éxito con ${finalVariants.length} SKU(s) y ${newProductPhotoItems.length} foto(s)!`);
      setShowAddModal(false);
      setNewProduct({
        nombre: "",
        categoria: "Envases",
        unidad_venta: "Unidad",
        descripcion: "",
        activo: true,
        destacado: false,
      });
      setNewProductVariants([
        {
          id: "v-1",
          sku: "",
          color: "Estándar",
          presentacion: "Unidad",
          stock: "100",
          precio_mayor_usd: "",
          min_mayor: "1",
          precio_gran_mayor_usd: "",
          min_gran_mayor: "5",
        },
      ]);
      newProductPhotoItems.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setNewProductPhotoItems([]);
      setNewProductVideo(null);
      setAddCostBase("");
      setCreateActiveTab("general");
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al crear producto", "error");
    } finally {
      setCreatingProduct(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // EDICIÓN COMPLETA DE PRODUCTO
  // ─────────────────────────────────────────────────────────
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.id) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editingProduct.nombre,
          categoria: editingProduct.categoria,
          descripcion: editingProduct.descripcionLarga,
          unidad_venta: editingProduct.unidadVenta,
          activo: editingProduct.activo,
          destacado: editingProduct.destacado,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar cambios");

      showToast("¡Información del producto actualizada con éxito!");
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Guardar o actualizar SKU / Variante dentro de Editar Producto
  const handleSaveEditVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.id) return;
    if (!editVariantForm.sku.trim() || !editVariantForm.color.trim()) {
      showToast("Código SKU y Color / Variante son obligatorios", "error");
      return;
    }

    setSavingVariant(true);
    try {
      if (editingVariantId) {
        // Actualizar SKU existente
        const res = await fetch(`/api/variants/${editingVariantId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: editVariantForm.sku.trim(),
            color: editVariantForm.color.trim(),
            presentacion: editVariantForm.presentacion,
            stock: Number(editVariantForm.stock),
            precio_mayor_usd: Number(editVariantForm.precio_mayor_usd),
            min_mayor: Number(editVariantForm.min_mayor),
            precio_gran_mayor_usd: Number(editVariantForm.precio_gran_mayor_usd),
            min_gran_mayor: Number(editVariantForm.min_gran_mayor),
          }),
        });
        if (!res.ok) throw new Error("Error al actualizar SKU");
        showToast(`SKU ${editVariantForm.sku} actualizado con éxito`);
      } else {
        // Crear nuevo SKU para este producto
        const res = await fetch("/api/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto_id: editingProduct.id,
            sku: editVariantForm.sku.trim(),
            color: editVariantForm.color.trim(),
            presentacion: editVariantForm.presentacion || editingProduct.unidadVenta || "Unidad",
            stock: Number(editVariantForm.stock) || 0,
            precio_mayor_usd: Number(editVariantForm.precio_mayor_usd) || 0,
            min_mayor: Number(editVariantForm.min_mayor) || 1,
            precio_gran_mayor_usd: Number(editVariantForm.precio_gran_mayor_usd) || 0,
            min_gran_mayor: Number(editVariantForm.min_gran_mayor) || 5,
          }),
        });
        if (!res.ok) throw new Error("Error al crear nuevo SKU");
        showToast(`Nuevo SKU ${editVariantForm.sku} agregado`);
      }

      setIsAddingEditVariant(false);
      setEditingVariantId(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al procesar SKU", "error");
    } finally {
      setSavingVariant(false);
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!prod?.id) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente el producto:\n\n"${prod.nombre}" (SKU: ${prod.sku})?\n\nEsta acción eliminará el producto, todas sus variantes y sus fotos de la tienda y del almacenamiento en la nube.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al eliminar producto");
      }
      showToast(`Producto "${prod.nombre}" eliminado con éxito`);
      if (editingProduct?.id === prod.id) {
        setEditingProduct(null);
      }
      if (mediaProduct?.id === prod.id) {
        setMediaProduct(null);
      }
      if (variantProduct?.id === prod.id) {
        setVariantProduct(null);
      }
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al eliminar el producto", "error");
    }
  };

  // Filtros de búsqueda
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.variantes || []).some((v) => v.sku.toLowerCase().includes(searchQuery.toLowerCase()) || (v.color || "").toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "todas" ||
        (p.categoria || "")
          .split(",")
          .map((c) => c.trim().toLowerCase())
          .includes(selectedCategory.toLowerCase());

      const hasValidPhoto = (p.fotos || []).some(
        (f) => !f.url.includes("placehold.co")
      );
      const matchesNoPhoto = filterNoPhoto ? !hasValidPhoto : true;
      const matchesDestacados = filterDestacados ? Boolean(p.destacado) : true;

      return matchesSearch && matchesCategory && matchesNoPhoto && matchesDestacados;
    });
  }, [products, searchQuery, selectedCategory, filterNoPhoto, filterDestacados]);

  const stats = useMemo(() => {
    const total = products.length;
    const conFoto = products.filter((p) =>
      (p.fotos || []).some((f) => !f.url.includes("placehold.co"))
    ).length;
    const conVideo = products.filter((p) => Boolean(p.videoUrl)).length;
    const destacados = products.filter((p) => Boolean(p.destacado)).length;
    const sinFoto = total - conFoto;
    return { total, conFoto, conVideo, sinFoto, destacados };
  }, [products]);

  const handleToggleDestacado = async (p: Product) => {
    const currentDestacadosCount = products.filter((prod) => prod.destacado).length;
    const newDestacado = !p.destacado;

    if (newDestacado && currentDestacadosCount >= 15) {
      showToast("Ya alcanzaste el límite de 15 productos destacados para el carrusel", "error");
      return;
    }

    setProducts((prev) =>
      prev.map((item) =>
        item.id === p.id ? { ...item, destacado: newDestacado } : item
      )
    );

    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destacado: newDestacado }),
      });

      if (!res.ok) {
        throw new Error();
      }

      showToast(
        newDestacado
          ? `⭐ "${p.nombre}" agregado al carrusel (${currentDestacadosCount + 1}/15)`
          : `"${p.nombre}" quitado del carrusel`,
        "success"
      );
    } catch {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, destacado: !newDestacado } : item
        )
      );
      showToast("Error al actualizar estado destacado", "error");
    }
  };

  // Pantalla de carga
  if (!authChecked) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-sm text-slate-400">
        Verificando credenciales...
      </div>
    );
  }

  // Pantalla de Login Admin
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col gap-5"
        >
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-50 text-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-emerald-800" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Gestor de Productos y Fotos
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa tus credenciales de administrador para continuar.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
            </div>

            {authError && (
              <p className="text-xs text-rose-500 font-semibold">{authError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full h-11 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover disabled:opacity-60 transition-colors shadow-sm"
          >
            {loggingIn ? "Verificando..." : "Ingresar al Gestor"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AdminNav onLogout={() => setIsAuthenticated(false)} />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Toast Feedback */}
        {feedbackMsg && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-2 ${
              feedbackMsg.type === "success"
                ? "bg-slate-900 text-white border-slate-800"
                : feedbackMsg.type === "error"
                ? "bg-rose-600 text-white border-rose-700"
                : "bg-blue-600 text-white border-blue-700"
            }`}
          >
            {feedbackMsg.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {feedbackMsg.type === "error" && <AlertCircle className="w-4 h-4 text-white" />}
            {feedbackMsg.type === "info" && <Sparkles className="w-4 h-4 text-amber-300" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Package className="w-7 h-7 text-brand" />
              Gestión de Productos, Multimedia y Variantes
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Sube carruseles de hasta 10 fotos y 1 video optimizados, y gestiona colores o presentaciones con 1 clic.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
            <button
              type="button"
              onClick={loadProducts}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refrescar</span>
            </button>
          </div>
        </div>

      {/* Contenido */}
      <div className="space-y-6">
        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Catálogo
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1 block">
              {stats.total}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Con Foto
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
              {stats.conFoto}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block flex items-center gap-1">
              <Film className="w-3.5 h-3.5" /> Con Video
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-800 mt-1 block">
              {stats.conVideo}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Sin Foto
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-800 mt-1 block">
              {stats.sinFoto}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Carrusel Destacados
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-900 mt-1 block">
              {stats.destacados} <span className="text-xs font-semibold text-slate-400">/ 15</span>
            </span>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, SKU o color de variante..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterDestacados(!filterDestacados)}
                className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  filterDestacados
                    ? "bg-amber-400 text-amber-950 border-amber-500 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${filterDestacados ? "fill-amber-950 text-amber-950" : "text-amber-500 fill-amber-500"}`} />
                <span>{filterDestacados ? "Mostrando: Destacados" : `Destacados (${stats.destacados}/15)`}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterNoPhoto(!filterNoPhoto)}
                className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  filterNoPhoto
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{filterNoPhoto ? "Mostrando: Sin Foto" : "Sin Foto"}</span>
              </button>
            </div>
          </div>

          {/* Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {["todas", ...availableCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-brand text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "todas" ? "Todas las categorías" : cat}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCategoryManager(true)}
              className="py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-brand flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all flex-shrink-0 ml-auto"
              title="Administrar o eliminar categorías"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Gestionar / Eliminar Categorías</span>
            </button>
          </div>
        </div>

        {/* Listado de Productos */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-3" />
            <p className="text-xs text-slate-400">Cargando productos de Supabase...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No se encontraron productos</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || filterNoPhoto || selectedCategory !== "todas"
                ? "Prueba cambiando los filtros de búsqueda o categoría."
                : "No hay productos registrados en tu base de datos de Supabase."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((p) => {
              const realPhotos = (p.fotos || []).filter((f) => !f.url.includes("placehold.co"));
              const mainPhoto = realPhotos.length > 0 ? realPhotos[0] : null;
              const hasRealPhoto = Boolean(mainPhoto);
              const hasVideo = Boolean(p.videoUrl);
              const variants = p.variantes || [];

              return (
                <div
                  key={p.sku}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Zona Superior: Visualización de Portada */}
                    <div className="relative w-full h-48 bg-slate-100 border-b border-slate-100 flex items-center justify-center overflow-hidden group">
                      {hasRealPhoto ? (
                        <img
                          src={mainPhoto!.url}
                          alt={p.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-1" />
                          <span className="text-[11px] font-bold text-slate-400 block">
                            Sin foto asignada
                          </span>
                        </div>
                      )}

                      {/* Badges superiores: Categoría, Fotos y Video */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10 max-w-[65%]">
                        {(p.categoria || "")
                          .split(",")
                          .map((c) => c.trim())
                          .filter(Boolean)
                          .map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs"
                            >
                              {cat}
                            </span>
                          ))}
                        <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-emerald-400" />
                          <span>{realPhotos.length}/10 fotos</span>
                        </span>
                        {hasVideo && (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-600/90 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                            <Film className="w-3 h-3" />
                            <span>Video</span>
                          </span>
                        )}
                      </div>

                      {/* Botón rápido para Destacar en el Carrusel (hasta 15) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDestacado(p);
                        }}
                        title={p.destacado ? "Quitar del carrusel Recomendado para ti" : "Destacar en carrusel Recomendado para ti"}
                        className={`absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 ${
                          p.destacado
                            ? "bg-amber-400 text-amber-950 hover:bg-amber-300 ring-2 ring-amber-400/50"
                            : "bg-black/60 hover:bg-black/80 text-white/90 backdrop-blur-xs"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${p.destacado ? "fill-amber-950 text-amber-950" : "text-amber-400"}`} />
                        <span>{p.destacado ? "Destacado" : "Destacar"}</span>
                      </button>

                      {/* Botón rápido para abrir gestor multimedia */}
                      <div className="absolute bottom-3 inset-x-3 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setEditActiveTab("photos");
                          }}
                          className="w-full py-2 px-3 bg-white/95 hover:bg-white text-slate-800 hover:text-brand font-bold text-xs rounded-xl shadow-md backdrop-blur-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200/80 active:scale-95"
                        >
                          <Upload className="w-3.5 h-3.5 text-brand" />
                          <span>Gestionar Fotos y Video</span>
                        </button>
                      </div>
                    </div>

                    {/* Zona Media: Datos del Producto y Variantes */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {p.sku}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.activo
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {p.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-slate-800 line-clamp-2 leading-snug">
                        {p.nombre}
                      </h4>

                      {/* Bloque de Variantes de Color */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-600 flex items-center gap-1">
                            <Palette className="w-3.5 h-3.5 text-brand" />
                            <span>Variantes ({variants.length || 1})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(p);
                              setEditActiveTab("variants");
                            }}
                            className="text-brand hover:underline font-bold text-[10px]"
                          >
                            Administrar
                          </button>
                        </div>

                        {variants.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {variants.map((v) => (
                              <span
                                key={v.sku}
                                className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-700 shadow-2xs"
                              >
                                {v.color || "Estándar"} <span className="text-slate-400 font-normal">({v.stock} u.)</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 block italic">
                            1 variante estándar
                          </span>
                        )}
                      </div>

                      {/* Precios */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-400 block font-semibold">Al Mayor</span>
                          <span className="font-black text-slate-800">
                            {p.precioMayorUsd ? formatUsd(p.precioMayorUsd) : "Sin precio"}
                          </span>
                          <span className="text-[10px] text-slate-400 block">min: {p.minMayor} u.</span>
                        </div>
                        <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-emerald-700 block font-semibold">Gran Mayor</span>
                          <span className="font-black text-emerald-900">
                            {p.precioGranMayorUsd ? formatUsd(p.precioGranMayorUsd) : "Sin precio"}
                          </span>
                          <span className="text-[10px] text-emerald-600 block">min: {p.minGranMayor || 5} u.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zona Inferior: Botones de Acción */}
                  <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Stock total: <strong className="text-slate-800">{p.stock}</strong> u.
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/producto/${p.slug}`}
                        target="_blank"
                        title="Ver en la tienda"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(p);
                          setEditActiveTab("general");
                        }}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p)}
                        title="Eliminar producto"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────
          MODAL: GESTOR MULTIMEDIA (FOTOS Y VIDEO)
          ───────────────────────────────────────────────────────── */}
      {mediaProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header Fijo */}
            <div className="flex items-start justify-between p-4 sm:p-6 pb-3 border-b border-slate-100 flex-shrink-0 bg-white">
              <div>
                <span className="text-[11px] font-bold text-brand uppercase tracking-wider block">
                  Galería Multimedia del Producto
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  {mediaProduct.nombre}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hasta 10 fotos optimizadas y 1 video para el carrusel de la tienda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMediaProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll único */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

            {/* Estado de procesamiento en vivo */}
            {isProcessingMedia && (
              <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/20 flex items-center gap-3 text-brand">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand" />
                <span className="text-xs font-bold">{mediaStatusText || "Procesando multimedia..."}</span>
              </div>
            )}

            {/* SECCIÓN 1: FOTOS (Máx 10) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-brand" />
                    <span>Fotos ({mediaProduct.fotos?.filter(f => !f.url.includes("placehold.co")).length || 0} / 10)</span>
                  </h4>

                  {/* Switch vista cuadrícula vs carrusel */}
                  {(mediaProduct.fotos?.filter(f => !f.url.includes("placehold.co")).length || 0) > 0 && (
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg ml-2">
                      <button
                        type="button"
                        onClick={() => setMediaViewMode("grid")}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                          mediaViewMode === "grid"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        🗂️ Cuadrícula y Orden
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaViewMode("carousel");
                          setMediaActiveCarouselIdx(0);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                          mediaViewMode === "carousel"
                            ? "bg-brand text-white shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        🖼️ Vista Carrusel
                      </button>
                    </div>
                  )}
                </div>

                {/* Input de subida de fotos múltiple */}
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isProcessingMedia}
                  onChange={(e) => {
                    if (e.target.files && mediaProduct.id) {
                      handleUploadPhotos(mediaProduct.id, e.target.files);
                      e.target.value = "";
                    }
                  }}
                  className="hidden"
                  id="media-photos-input"
                />
                <label
                  htmlFor="media-photos-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-hover shadow-xs active:scale-95 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Subir Fotos</span>
                </label>
              </div>

              {/* VISTA CARRUSEL INTERACTIVO */}
              {mediaViewMode === "carousel" && (
                (() => {
                  const realPhotos = (mediaProduct.fotos || []).filter((f) => !f.url.includes("placehold.co"));
                  if (realPhotos.length === 0) return null;
                  const currentPhoto = realPhotos[mediaActiveCarouselIdx] || realPhotos[0];
                  return (
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-900 text-white">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                        <span className="font-bold flex items-center gap-1.5 text-slate-300">
                          <Eye className="w-3.5 h-3.5 text-brand" />
                          Previsualización del Carrusel (así lo ven los clientes en la tienda)
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {mediaActiveCarouselIdx + 1} / {realPhotos.length}
                        </span>
                      </div>

                      {/* Visor Principal con Flechas */}
                      <div className="relative aspect-video max-h-72 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={currentPhoto.url}
                          alt={currentPhoto.alt}
                          className="max-h-72 w-full object-contain"
                        />

                        {/* Botón Anterior */}
                        <button
                          type="button"
                          onClick={() => setMediaActiveCarouselIdx((prev) => (prev > 0 ? prev - 1 : realPhotos.length - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Botón Siguiente */}
                        <button
                          type="button"
                          onClick={() => setMediaActiveCarouselIdx((prev) => (prev < realPhotos.length - 1 ? prev + 1 : 0))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Badge de Portada en el carrusel */}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          {currentPhoto.isPrimary ? (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-black flex items-center gap-1 shadow-md">
                              <Star className="w-3.5 h-3.5 fill-white" /> Portada Principal de la Tienda
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryPhoto(mediaProduct.id!, currentPhoto.publicId!)}
                              className="px-2.5 py-1 rounded-md bg-black/80 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-md"
                            >
                              <Star className="w-3 h-3" /> Hacer Portada Principal
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tira de Miniaturas del Carrusel */}
                      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                        {realPhotos.map((f, i) => (
                          <button
                            key={f.publicId || f.url}
                            type="button"
                            onClick={() => setMediaActiveCarouselIdx(i)}
                            className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                              i === mediaActiveCarouselIdx
                                ? "border-brand ring-2 ring-brand/40 scale-105"
                                : "border-slate-700 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={f.url} alt="" className="w-full h-full object-cover" />
                            {f.isPrimary && (
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400 absolute top-0.5 right-0.5" />
                            )}
                            <span className="absolute bottom-0.5 left-1 text-[8px] font-mono font-bold bg-black/70 px-1 rounded text-white">
                              #{i + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Grid de Fotos Actuales (Vista Cuadrícula y Orden) */}
              {mediaViewMode === "grid" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {(mediaProduct.fotos || [])
                    .filter((f) => !f.url.includes("placehold.co"))
                    .map((foto, idx, arr) => (
                      <div
                        key={foto.publicId || foto.url}
                        className={`bg-white rounded-2xl border p-2 shadow-2xs space-y-1.5 flex flex-col justify-between transition-all ${
                          foto.isPrimary ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
                        }`}
                      >
                        <div className="relative group rounded-xl overflow-hidden aspect-square bg-slate-50 border border-slate-100">
                          <img src={foto.url} alt={foto.alt} className="w-full h-full object-cover" />

                          {/* Badge de Portada Principal */}
                          {foto.isPrimary ? (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-white" /> Portada
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryPhoto(mediaProduct.id!, foto.publicId!)}
                              title="Hacer foto principal de portada"
                              className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 hover:bg-emerald-600 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Hacer Portada
                            </button>
                          )}

                          {/* Botón Eliminar Foto */}
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(mediaProduct.id!, foto.publicId!, foto.url)}
                            title="Eliminar foto"
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600/90 text-white hover:bg-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-white bg-black/50 px-1 rounded">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Botones de orden: Mover antes / después */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={idx === 0 || isProcessingMedia}
                            onClick={() => handleMoveExistingPhoto(mediaProduct.id!, idx, idx - 1)}
                            title="Mover foto antes en el carrusel"
                            className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-700 flex items-center justify-center gap-0.5 transition-colors"
                          >
                            <ChevronLeft className="w-3 h-3" />
                            <span>Antes</span>
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1 || isProcessingMedia}
                            onClick={() => handleMoveExistingPhoto(mediaProduct.id!, idx, idx + 1)}
                            title="Mover foto después en el carrusel"
                            className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-700 flex items-center justify-center gap-0.5 transition-colors"
                          >
                            <span>Después</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Selector de Variante / Color Asociado */}
                        <div className="space-y-0.5 pt-1 border-t border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Variante:
                          </span>
                          <select
                            value={foto.varianteColor || ""}
                            disabled={isProcessingMedia}
                            onChange={(e) => handleSetPhotoVariant(mediaProduct.id!, foto.publicId!, e.target.value)}
                            className={`w-full text-[10px] font-bold py-1 px-1.5 rounded-lg border transition-colors ${
                              foto.varianteColor
                                ? "bg-brand/10 text-brand border-brand/30"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            <option value="">🌐 General (Todas)</option>
                            {(mediaProduct.variantes || []).map((v) => (
                              <option key={v.sku} value={v.color}>
                                🎨 {v.color}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}

                  {(mediaProduct.fotos || []).filter((f) => !f.url.includes("placehold.co")).length === 0 && (
                    <div className="col-span-2 sm:col-span-4 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 text-xs">
                      No hay fotos subidas todavía. Toca &ldquo;Subir Fotos&rdquo; para agregar fotos directamente desde tu galería.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: VIDEO DEL PRODUCTO (Máx 1) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-purple-600" />
                  <span>Video Demostrativo del Producto ({mediaProduct.videoUrl ? "1 / 1" : "0 / 1"})</span>
                </h4>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={isProcessingMedia}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && mediaProduct.id) {
                      handleUploadVideo(mediaProduct.id, file);
                    }
                  }}
                  className="hidden"
                  id="media-video-input"
                />
                <label
                  htmlFor="media-video-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{mediaProduct.videoUrl ? "Cambiar Video" : "Subir Video (máx 30 MB)"}</span>
                </label>
              </div>

              {mediaProduct.videoUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 max-h-56 flex items-center justify-center">
                  <video
                    src={mediaProduct.videoUrl}
                    controls
                    preload="metadata"
                    className="max-h-56 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteVideo(mediaProduct.id!, mediaProduct.videoUrl!)}
                    className="absolute top-2.5 right-2.5 py-1 px-2.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar Video</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs text-purple-800 flex items-center gap-3">
                  <Play className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span>
                    Agrega un video de 10 a 30 segundos mostrando el producto en uso o sus acabados para aumentar las ventas.
                  </span>
                </div>
              )}
            </div>

            </div>

            {/* Footer Fijo */}
            <div className="p-3.5 sm:px-6 border-t border-slate-100 flex justify-end flex-shrink-0 bg-slate-50/90">
              <button
                type="button"
                onClick={() => setMediaProduct(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

         {/* ─────────────────────────────────────────────────────────
          MODAL: NUEVO PRODUCTO (COMPLETO: DATOS, SKUs Y FOTOS CON VARIANTE)
          ───────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header Fijo Siempre Visible Arriba */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Agregar Nuevo Producto
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Información general, todos los SKUs y fotos del carrusel
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Pestañas (Tabs) Unificada */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 gap-2 flex-shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setCreateActiveTab("general")}
                className={`py-3 px-3.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  createActiveTab === "general"
                    ? "border-brand text-brand font-black bg-white/70"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-4 h-4" />
                <span>1. Información General</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateActiveTab("variants")}
                className={`py-3 px-3.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  createActiveTab === "variants"
                    ? "border-brand text-brand font-black bg-white/70"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>2. Variantes & SKUs</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand/10 text-brand font-black">
                  {newProductVariants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCreateActiveTab("photos")}
                className={`py-3 px-3.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  createActiveTab === "photos"
                    ? "border-brand text-brand font-black bg-white/70"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>3. Galería de Fotos</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand/10 text-brand font-black">
                  {newProductPhotoItems.length}
                </span>
              </button>
            </div>

            {/* Contenedor con Scroll Único */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              {/* ─────────────────────────────────────────────────────────
                  PESTAÑA 1: INFORMACIÓN GENERAL
                  ───────────────────────────────────────────────────────── */}
              {createActiveTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nombre Completo del Producto *
                    </label>
                    <input
                      type="text"
                      value={newProduct.nombre}
                      onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                      placeholder="Bolsa para Café 250Gr con Ziplock + Válvula"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold text-sm"
                      required
                    />
                  </div>

                  {/* Selector múltiple de Categorías */}
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800 text-xs">
                        Categorías del Producto * <span className="font-normal text-slate-500">(Puedes asignarle varias categorías)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryManager(true)}
                        className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Gestionar / Eliminar Categorías</span>
                      </button>
                    </div>

                    {/* Chips de categorías asignadas actualmente */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-xl min-h-[42px] items-center">
                      {newProductSelectedCategories.length > 0 ? (
                        newProductSelectedCategories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand text-white font-bold text-xs shadow-2xs animate-fadeIn"
                          >
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveNewCategory(cat)}
                              className="hover:bg-white/20 rounded p-0.5 transition-colors"
                              title={`Quitar ${cat}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold italic">
                          ⚠️ Haz clic en una o más categorías abajo para asignarlas al producto
                        </span>
                      )}
                    </div>

                    {/* Botones de selección rápida */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">
                        Categorías disponibles (haz clic para activar o desactivar):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                        {availableCategories.map((cat) => {
                          const isSelected = newProductSelectedCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleToggleNewCategory(cat)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-brand text-white shadow-2xs ring-2 ring-brand/40"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Crear nueva categoría en el momento */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={inlineNewCatInput}
                        onChange={(e) => setInlineNewCatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddInlineNewCategory(false);
                          }
                        }}
                        placeholder="+ Escribir nueva categoría (ej. Vasos, Limpieza) y presionar Enter..."
                        className="flex-1 h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:border-brand focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInlineNewCategory(false)}
                        className="h-9 px-3.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear y Asignar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unidad de Venta *</label>
                    <input
                      type="text"
                      value={newProduct.unidad_venta}
                      onChange={(e) => setNewProduct({ ...newProduct, unidad_venta: e.target.value })}
                      placeholder="ej. Unidad, 50 Und, Bulto, Paquete"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Descripción del Producto</label>
                    <textarea
                      rows={4}
                      value={newProduct.descripcion}
                      onChange={(e) => setNewProduct({ ...newProduct, descripcion: e.target.value })}
                      placeholder="Especificaciones técnicas, materiales, usos recomendados..."
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProduct.activo}
                        onChange={(e) => setNewProduct({ ...newProduct, activo: e.target.checked })}
                        className="rounded text-brand focus:ring-brand w-4 h-4"
                      />
                      <span className="font-bold text-slate-700">Producto Activo en tienda</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProduct.destacado}
                        onChange={(e) => setNewProduct({ ...newProduct, destacado: e.target.checked })}
                        className="rounded text-brand focus:ring-brand w-4 h-4"
                      />
                      <span className="font-bold text-slate-700">Destacado en portada</span>
                    </label>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCreateActiveTab("variants")}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xs"
                    >
                      <span>Continuar a Variantes & SKUs</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                  PESTAÑA 2: CARGA Y GESTIÓN DE TODOS LOS SKUS / VARIANTES
                  ───────────────────────────────────────────────────────── */}
              {createActiveTab === "variants" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Carga y Configuración de SKUs ({newProductVariants.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Puedes cargar todos los SKU que tenga este producto (colores, modelos o presentaciones).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNewProductVariant}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-hover shadow-xs active:scale-95 transition-all self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Agregar Otro SKU</span>
                    </button>
                  </div>

                  {/* Calculadora de Precios Integrada */}
                  <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/40 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                            Calculadora de Precios: Costo ÷ Factor (ej. $10 ÷ 0.70 = $14.29)
                          </h4>
                          <p className="text-[11px] text-emerald-800">
                            Fija los precios de tus SKUs con IVA Compra (16%) y/o IVA Venta (16%)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddCalc(!showAddCalc)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        {showAddCalc ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>

                    {showAddCalc && (
                      <div className="space-y-3.5 pt-1 text-xs">
                        {/* Opciones globales de IVA */}
                        <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-200">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-[11px]">
                            <input
                              type="checkbox"
                              checked={addApplyIvaCompra}
                              onChange={(e) => setAddApplyIvaCompra(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <span>¿Los costos de compra ya incluyen IVA? (Descontar Crédito Fiscal)</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950 text-[11px] ml-auto">
                            <input
                              type="checkbox"
                              checked={addApplyIvaVenta}
                              onChange={(e) => setAddApplyIvaVenta(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <span>+ IVA 16% a la Venta (Cobro al cliente en tienda)</span>
                          </label>
                        </div>

                        {/* Dos Columnas Simétricas: Mayor y Gran Mayor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* Columna Nivel 1: Venta al Mayor */}
                          <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 space-y-3 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-black text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-2 h-2 rounded-full bg-slate-900" />
                                Nivel 1: Venta al Mayor
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                Regular
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block font-bold text-slate-700 text-[11px] mb-1">
                                  Costo de Compra Mayor ($ USD) *
                                </label>
                                <div className="relative">
                                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={addCostBase}
                                    onChange={(e) => setAddCostBase(e.target.value)}
                                    placeholder="ej. 10.00"
                                    className="w-full h-8 pl-7 pr-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-bold text-xs text-slate-900"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-bold text-slate-700 text-[11px] mb-1">
                                    Cant. Mínima Mayor *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={addMinMayor}
                                    onChange={(e) => setAddMinMayor(e.target.value)}
                                    placeholder="1"
                                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-bold text-xs text-slate-900"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="font-bold text-slate-700 text-[11px]">
                                      Factor Divisor Mayor
                                    </label>
                                    <span className="text-[10px] font-black text-emerald-700">
                                      ÷ {computePricing(addCostBase, addApplyIvaCompra, addApplyIvaVenta, addMarginMayor, addMarginGranMayor, addMinMayor, addMinGranMayor, addCostGranBase).factorMayorStr}
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    value={addMarginMayor}
                                    onChange={(e) => setAddMarginMayor(e.target.value)}
                                    placeholder="0.70"
                                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-bold text-xs"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Desglose Fiscal Mayor */}
                            {parseFloat(addCostBase) > 0 && (() => {
                              const p = computePricing(addCostBase, addApplyIvaCompra, addApplyIvaVenta, addMarginMayor, addMarginGranMayor, addMinMayor, addMinGranMayor, addCostGranBase);
                              return (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] space-y-1">
                                  <div className="grid grid-cols-2 gap-1 text-slate-600">
                                    <span>Base Real: <strong>${p.costBaseMayor.toFixed(2)}</strong></span>
                                    <span>Crédito Fiscal: <strong className="text-emerald-700">+${p.creditoFiscalMayor.toFixed(2)}</strong></span>
                                    <span>Débito Fiscal: <strong className="text-blue-700">+${p.ivaMayor.toFixed(2)}</strong></span>
                                    <span>A pagar SENIAT: <strong className="text-purple-700">${p.ivaSeniatMayor.toFixed(2)}</strong></span>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] font-bold">
                                    <span className="text-slate-600">Ganancia Neta: <strong className="text-emerald-700">${p.profitMayor.toFixed(2)}</strong></span>
                                    <span className="text-slate-900">Precio Mayor: <strong className="text-emerald-800 text-xs font-black">${p.pMayor.toFixed(2)}</strong></span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Columna Nivel 2: Gran Mayor (Volumen) */}
                          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-3 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                              <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                Nivel 2: Gran Mayor (Volumen)
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
                                Descuento Proveedor
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block font-bold text-emerald-950 text-[11px] mb-1">
                                  Costo Compra Gran Mayor ($ USD)
                                </label>
                                <div className="relative">
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-700 absolute left-2.5 top-2.5" />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={addCostGranBase}
                                    onChange={(e) => setAddCostGranBase(e.target.value)}
                                    placeholder={addCostBase ? `Mismo costo ($${addCostBase})` : "ej. 8.50"}
                                    className="w-full h-8 pl-7 pr-3 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                  />
                                </div>
                                <span className="text-[9px] text-emerald-700 font-medium block mt-0.5 pl-0.5">
                                  {addCostGranBase ? `✓ Costo especial proveedor: $${addCostGranBase} por paquete` : `(Si está vacío, usa el costo de Mayor: $${addCostBase || "0.00"})`}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-bold text-emerald-950 text-[11px] mb-1">
                                    Cant. Mínima Gran Mayor *
                                  </label>
                                  <input
                                    type="number"
                                    min="2"
                                    value={addMinGranMayor}
                                    onChange={(e) => setAddMinGranMayor(e.target.value)}
                                    placeholder="5"
                                    className="w-full h-8 px-2.5 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="font-bold text-emerald-950 text-[11px]">
                                      Factor Divisor Gran Mayor
                                    </label>
                                    <span className="text-[10px] font-black text-emerald-800">
                                      ÷ {computePricing(addCostBase, addApplyIvaCompra, addApplyIvaVenta, addMarginMayor, addMarginGranMayor, addMinMayor, addMinGranMayor, addCostGranBase).factorGranStr}
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    value={addMarginGranMayor}
                                    onChange={(e) => setAddMarginGranMayor(e.target.value)}
                                    placeholder="0.80"
                                    className="w-full h-8 px-2.5 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Desglose Fiscal Gran Mayor */}
                            {parseFloat(addCostBase) > 0 && (() => {
                              const p = computePricing(
                                addCostBase,
                                addApplyIvaCompra,
                                addApplyIvaVenta,
                                addMarginMayor,
                                addMarginGranMayor,
                                addMinMayor,
                                addMinGranMayor,
                                addCostGranBase
                              );
                              return (
                                <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-300 text-[10px] space-y-1">
                                  <div className="grid grid-cols-2 gap-1 text-slate-600">
                                    <span>Base Real: <strong>${p.costBaseGran.toFixed(2)}</strong></span>
                                    <span>Crédito Fiscal: <strong className="text-emerald-700">+${p.creditoFiscalGran.toFixed(2)}</strong></span>
                                    <span>Débito Fiscal: <strong className="text-blue-700">+${p.ivaGran.toFixed(2)}</strong></span>
                                    <span>A pagar SENIAT: <strong className="text-purple-700">${p.ivaSeniatGran.toFixed(2)}</strong></span>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-emerald-100 text-[11px] font-bold">
                                    <span className="text-slate-700">Ganancia Neta: <strong className="text-emerald-700">${p.profitGran.toFixed(2)}</strong></span>
                                    <span className="text-emerald-950">Precio Gran Mayor: <strong className="text-emerald-800 text-xs font-black">${p.pGran.toFixed(2)}</strong></span>
                                  </div>
                                  {p.savingsGranMayor > 0 && (
                                    <div className="text-center pt-0.5 text-[10px] font-black text-amber-700 bg-amber-50 rounded-md py-0.5">
                                      ★ Ahorro para el cliente al comprar {p.minGM} u.: ${p.savingsGranMayor.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Botón Aplicar Precios */}
                        {parseFloat(addCostBase) > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px] text-slate-600">Aplicar a:</span>
                              <select
                                value={activeNewVariantIdx}
                                onChange={(e) => {
                                  const idx = Number(e.target.value);
                                  setActiveNewVariantIdx(idx);
                                  const v = newProductVariants[idx];
                                  if (v) {
                                    if (v.min_mayor) setAddMinMayor(v.min_mayor);
                                    if (v.min_gran_mayor) setAddMinGranMayor(v.min_gran_mayor);
                                  }
                                }}
                                className="h-8 px-2 rounded-lg border border-slate-300 font-bold text-xs bg-white"
                              >
                                {newProductVariants.map((v, i) => (
                                  <option key={v.id} value={i}>
                                    SKU #{i + 1}: {v.color || "Estándar"}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const targetVar = newProductVariants[activeNewVariantIdx] || newProductVariants[0];
                                  const computed = computePricing(
                                    addCostBase,
                                    addApplyIvaCompra,
                                    addApplyIvaVenta,
                                    addMarginMayor,
                                    addMarginGranMayor,
                                    addMinMayor || "1",
                                    addMinGranMayor || "5",
                                    addCostGranBase
                                  );
                                  handleUpdateNewProductVariant(targetVar.id, "precio_mayor_usd", computed.pMayor.toFixed(2));
                                  handleUpdateNewProductVariant(targetVar.id, "min_mayor", addMinMayor || "1");
                                  handleUpdateNewProductVariant(targetVar.id, "precio_gran_mayor_usd", computed.pGran.toFixed(2));
                                  handleUpdateNewProductVariant(targetVar.id, "min_gran_mayor", addMinGranMayor || "5");
                                  showToast(`¡Precios y Cantidades aplicados a SKU #${activeNewVariantIdx + 1}!`);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Aplicar a este SKU</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setNewProductVariants((prev) =>
                                    prev.map((v) => {
                                      const computed = computePricing(
                                        addCostBase,
                                        addApplyIvaCompra,
                                        addApplyIvaVenta,
                                        addMarginMayor,
                                        addMarginGranMayor,
                                        addMinMayor || "1",
                                        addMinGranMayor || "5",
                                        addCostGranBase
                                      );
                                      return {
                                        ...v,
                                        precio_mayor_usd: computed.pMayor.toFixed(2),
                                        min_mayor: addMinMayor || "1",
                                        precio_gran_mayor_usd: computed.pGran.toFixed(2),
                                        min_gran_mayor: addMinGranMayor || "5",
                                      };
                                    })
                                  );
                                  showToast("¡Precios y Cantidades Mínimas aplicados a TODOS los SKUs!");
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                              >
                                Aplicar a Todos
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Listado de Tarjetas de SKUs */}
                  <div className="space-y-3">
                    {newProductVariants.map((v, idx) => {
                      const resPricing = computePricing(
                        addCostBase || "10",
                        addApplyIvaCompra,
                        addApplyIvaVenta,
                        addMarginMayor,
                        addMarginGranMayor,
                        v.min_mayor,
                        v.min_gran_mayor,
                        addCostGranBase
                      );

                      return (
                        <div
                          key={v.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <span className="font-black text-slate-800 text-sm">
                                {v.color || "Variante Estándar"}
                              </span>
                              {v.sku && (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {v.sku}
                                </span>
                              )}
                            </div>

                            {newProductVariants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNewProductVariant(v.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Eliminar este SKU"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Fila 1: Código, Color, Presentación, Stock */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                Código SKU *
                              </label>
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => handleUpdateNewProductVariant(v.id, "sku", e.target.value)}
                                placeholder="ej. BOL-CAF-ROJ"
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono text-xs font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                Color / Variante *
                              </label>
                              <input
                                type="text"
                                value={v.color}
                                onChange={(e) => handleUpdateNewProductVariant(v.id, "color", e.target.value)}
                                placeholder="ej. Rojo, Negro, Dorado"
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                Presentación
                              </label>
                              <input
                                type="text"
                                value={v.presentacion}
                                onChange={(e) => handleUpdateNewProductVariant(v.id, "presentacion", e.target.value)}
                                placeholder="ej. 50 Und"
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                Stock Inicial
                              </label>
                              <input
                                type="number"
                                value={v.stock}
                                onChange={(e) => handleUpdateNewProductVariant(v.id, "stock", e.target.value)}
                                placeholder="100"
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-bold text-xs"
                              />
                            </div>
                          </div>

                          {/* Fila 2: Precios Nivel 1 (Mayor) y Nivel 2 (Gran Mayor) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <span className="text-[10px] font-black uppercase text-slate-700 block">
                                Nivel 1: Venta al Mayor
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-0.5">Min. Cantidad</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={v.min_mayor}
                                    onChange={(e) => handleUpdateNewProductVariant(v.id, "min_mayor", e.target.value)}
                                    className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-0.5">Precio ($ USD) *</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.precio_mayor_usd}
                                    onChange={(e) => handleUpdateNewProductVariant(v.id, "precio_mayor_usd", e.target.value)}
                                    placeholder="22.75"
                                    className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white font-black text-xs text-slate-900"
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-emerald-950">
                                  Nivel 2: Gran Mayor (Volumen)
                                </span>
                                {v.precio_mayor_usd && v.precio_gran_mayor_usd && (
                                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded">
                                    Ahorro por volumen
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-emerald-800 mb-0.5">Min. Cantidad</label>
                                  <input
                                    type="number"
                                    min="2"
                                    value={v.min_gran_mayor}
                                    onChange={(e) => handleUpdateNewProductVariant(v.id, "min_gran_mayor", e.target.value)}
                                    className="w-full h-8 px-2 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-emerald-800 mb-0.5">Precio ($ USD) *</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.precio_gran_mayor_usd}
                                    onChange={(e) => handleUpdateNewProductVariant(v.id, "precio_gran_mayor_usd", e.target.value)}
                                    placeholder="19.50"
                                    className="w-full h-8 px-2 rounded-lg border border-emerald-300 bg-white font-black text-xs text-emerald-900"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleAddNewProductVariant}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border border-brand/30 text-brand hover:bg-brand/10 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Otro SKU / Color</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateActiveTab("photos")}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xs"
                    >
                      <span>Continuar a Fotos del Carrusel</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                  PESTAÑA 3: FOTOS DEL PRODUCTO Y VINCULACIÓN CON VARIANTES
                  ───────────────────────────────────────────────────────── */}
              {createActiveTab === "photos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Fotos del Producto ({newProductPhotoItems.length} / 10)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Sube las fotos, selecciona la portada principal y vincula cada foto a su color/variante.
                      </p>
                    </div>

                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-hover shadow-xs active:scale-95 transition-all">
                      <Plus className="w-4 h-4" />
                      <span>Seleccionar Fotos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleSelectNewPhotos}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {newProductPhotoItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      {newProductPhotoItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`relative rounded-2xl border p-2 bg-white transition-all shadow-2xs flex flex-col justify-between space-y-2 ${
                            item.isPrimary
                              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100 border border-slate-100">
                            <img
                              src={item.previewUrl}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {item.isPrimary ? (
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                                <Star className="w-3 h-3 fill-white" /> Portada
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryNewPhoto(item.id)}
                                className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 hover:bg-emerald-600 text-white text-[10px] font-bold opacity-90 group-hover:opacity-100 transition-opacity"
                              >
                                Hacer Portada
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveNewPhoto(item.id)}
                              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            <span className="absolute bottom-1.5 right-1.5 text-[9px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                          </div>

                          {/* Botones de orden */}
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveNewPhoto(idx, -1)}
                              className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-700 flex items-center justify-center gap-0.5 transition-colors"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              <span>Antes</span>
                            </button>
                            <button
                              type="button"
                              disabled={idx === newProductPhotoItems.length - 1}
                              onClick={() => handleMoveNewPhoto(idx, 1)}
                              className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-700 flex items-center justify-center gap-0.5 transition-colors"
                            >
                              <span>Después</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Vinculación con Variante / Color */}
                          <div className="pt-1.5 border-t border-slate-100 space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                              <Palette className="w-3 h-3 text-brand" />
                              <span>Vincular a Color / SKU:</span>
                            </label>
                            <select
                              value={item.varianteColor || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewProductPhotoItems((prev) =>
                                  prev.map((p) => (p.id === item.id ? { ...p, varianteColor: val } : p))
                                );
                              }}
                              className={`w-full text-xs font-bold py-1.5 px-2 rounded-xl border transition-colors ${
                                item.varianteColor
                                  ? "bg-brand/10 text-brand border-brand/30 ring-1 ring-brand/20"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              <option value="">🌐 General (Todas las variantes)</option>
                              {newProductVariants.map((v, i) => (
                                <option key={v.id} value={v.color}>
                                  🎨 {v.color || `Variante ${i + 1}`} {v.sku ? `(SKU: ${v.sku})` : ""}
                                </option>
                              ))}
                            </select>
                            {item.varianteColor && (
                              <span className="text-[9px] font-black text-brand block">
                                ✓ Asociada a {item.varianteColor}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                      <span className="font-medium">No has seleccionado fotos todavía.</span>
                      <label className="cursor-pointer px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-hover shadow-xs mt-1">
                        <span>Seleccionar Fotos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleSelectNewPhotos}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Fijo Siempre Visible Abajo */}
            <div className="p-3.5 sm:px-6 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/90 text-xs">
              <span className="text-slate-500 font-bold">
                {newProductVariants.length} SKU(s) · {newProductPhotoItems.length} foto(s)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  disabled={creatingProduct}
                  className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover shadow-sm disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creatingProduct ? "Creando Producto..." : "Crear Producto Completo"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: EDITAR INFORMACIÓN COMPLETA DEL PRODUCTO
          ───────────────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header Fijo */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Editar Información del Producto
                  </h3>
                  <span className="text-[11px] text-slate-500 truncate max-w-md block">
                    {editingProduct.nombre} · SKU: {editingProduct.sku}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Pestañas (Tabs) Unificada */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 gap-2 flex-shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setEditActiveTab("general")}
                className={`py-3 px-3.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  editActiveTab === "general"
                    ? "border-brand text-brand font-black bg-white/70"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-4 h-4" />
                <span>1. Información General</span>
              </button>

              <button
                type="button"
                onClick={() => setEditActiveTab("variants")}
                className={`py-3 px-3.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  editActiveTab === "variants"
                    ? "border-brand text-brand font-black bg-white/70"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>2. Variantes & SKUs</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand/10 text-brand font-black">
                  {(editingProduct.variantes || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEditActiveTab("photos")}
                className={`py-3 px-3.5 font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  editActiveTab === "photos"
                    ? "border-brand text-brand font-black bg-white/70"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>3. Galería de Fotos</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand/10 text-brand font-black">
                  {(editingProduct.fotos || []).filter((f) => !f.url.includes("placehold.co")).length}
                </span>
              </button>
            </div>

            {/* Contenido desplazable con scroll único */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              {/* ─────────────────────────────────────────────────────────
                  PESTAÑA 1: INFORMACIÓN GENERAL
                  ───────────────────────────────────────────────────────── */}
              {editActiveTab === "general" && (
                <form id="form-edit-product" onSubmit={handleSaveEditProduct} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      value={editingProduct.nombre}
                      onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold text-sm"
                      required
                    />
                  </div>

                  {/* Selector múltiple de Categorías */}
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800 text-xs">
                        Categorías del Producto * <span className="font-normal text-slate-500">(Puedes asignarle varias categorías)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryManager(true)}
                        className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Gestionar / Eliminar Categorías</span>
                      </button>
                    </div>

                    {/* Chips de categorías asignadas actualmente */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-xl min-h-[42px] items-center">
                      {editProductSelectedCategories.length > 0 ? (
                        editProductSelectedCategories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand text-white font-bold text-xs shadow-2xs animate-fadeIn"
                          >
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditCategory(cat)}
                              className="hover:bg-white/20 rounded p-0.5 transition-colors"
                              title={`Quitar ${cat}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold italic">
                          ⚠️ Haz clic en una o más categorías abajo para asignarlas al producto
                        </span>
                      )}
                    </div>

                    {/* Botones de selección rápida */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">
                        Categorías disponibles (haz clic para activar o desactivar):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                        {Array.from(new Set([...availableCategories, ...editProductSelectedCategories])).map((cat) => {
                          const isSelected = editProductSelectedCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleToggleEditCategory(cat)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-brand text-white shadow-2xs ring-2 ring-brand/40"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Crear nueva categoría en el momento */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={inlineEditCatInput}
                        onChange={(e) => setInlineEditCatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddInlineNewCategory(true);
                          }
                        }}
                        placeholder="+ Escribir nueva categoría (ej. Vasos, Limpieza) y presionar Enter..."
                        className="flex-1 h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:border-brand focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInlineNewCategory(true)}
                        className="h-9 px-3.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear y Asignar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unidad de Venta</label>
                    <input
                      type="text"
                      value={editingProduct.unidadVenta || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unidadVenta: e.target.value })}
                      placeholder="ej. Unidad, 50 Und, Bulto"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                    <textarea
                      rows={4}
                      value={editingProduct.descripcionLarga || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, descripcionLarga: e.target.value })}
                      placeholder="Descripción detallada del producto..."
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.activo}
                        onChange={(e) => setEditingProduct({ ...editingProduct, activo: e.target.checked })}
                        className="rounded text-brand focus:ring-brand w-4 h-4"
                      />
                      <span className="font-bold text-slate-700">Producto Activo en tienda</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.destacado || false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, destacado: e.target.checked })}
                        className="rounded text-brand focus:ring-brand w-4 h-4"
                      />
                      <span className="font-bold text-slate-700">Destacado</span>
                    </label>
                  </div>
                </form>
              )}

              {/* ─────────────────────────────────────────────────────────
                  PESTAÑA 2: GESTIÓN DE TODOS LOS SKUS / VARIANTES
                  ───────────────────────────────────────────────────────── */}
              {editActiveTab === "variants" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        SKUs y Variantes Registradas ({(editingProduct.variantes || []).length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Administra todos los SKUs, stock disponible y precios Mayor y Gran Mayor.
                      </p>
                    </div>

                    {!isAddingEditVariant && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingEditVariant(true);
                          setEditingVariantId(null);
                          setEditVariantForm({
                            color: "",
                            sku: `${editingProduct.sku}-${(editingProduct.variantes || []).length + 1}`,
                            presentacion: editingProduct.unidadVenta || "Unidad",
                            stock: "100",
                            precio_mayor_usd: editingProduct.precioMayorUsd ? String(editingProduct.precioMayorUsd) : "",
                            min_mayor: String(editingProduct.minMayor || 1),
                            precio_gran_mayor_usd: editingProduct.precioGranMayorUsd ? String(editingProduct.precioGranMayorUsd) : "",
                            min_gran_mayor: String(editingProduct.minGranMayor || 5),
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-hover shadow-xs active:scale-95 transition-all self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Cargar Nuevo SKU</span>
                      </button>
                    )}
                  </div>

                  {/* Formulario para Agregar o Editar SKU */}
                  {isAddingEditVariant && (
                    <form
                      onSubmit={handleSaveEditVariant}
                      className="p-4 rounded-2xl bg-white border-2 border-brand/30 space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-black text-slate-800 text-sm">
                          {editingVariantId ? "Modificar SKU Existente" : "Cargar Nuevo SKU a este Producto"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingEditVariant(false);
                            setEditingVariantId(null);
                          }}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Código SKU *
                          </label>
                          <input
                            type="text"
                            value={editVariantForm.sku}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, sku: e.target.value })}
                            placeholder="DOY-ROJ-250"
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono text-xs font-bold"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Color / Variante *
                          </label>
                          <input
                            type="text"
                            value={editVariantForm.color}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, color: e.target.value })}
                            placeholder="ej. Rojo, Negro"
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Presentación
                          </label>
                          <input
                            type="text"
                            value={editVariantForm.presentacion}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, presentacion: e.target.value })}
                            placeholder="ej. 50 Und"
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Stock Disponible
                          </label>
                          <input
                            type="number"
                            value={editVariantForm.stock}
                            onChange={(e) => setEditVariantForm({ ...editVariantForm, stock: e.target.value })}
                            placeholder="100"
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-bold text-xs"
                          />
                        </div>
                      </div>

                      {/* Calculadora en Formulario de SKU */}
                      <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/40 p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Calculator className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                                Calculadora de Precios: Costo ÷ Factor (ej. $10 ÷ 0.70 = $14.29)
                              </h4>
                              <p className="text-[11px] text-emerald-800">
                                Fija los precios de este SKU con IVA Compra (16%) y/o IVA Venta (16%)
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowEditVarCalc(!showEditVarCalc)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                          >
                            {showEditVarCalc ? "Ocultar" : "Mostrar"}
                          </button>
                        </div>

                        {showEditVarCalc && (
                          <div className="space-y-3.5 pt-1 text-xs">
                            {/* Opciones globales de IVA */}
                            <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-200">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={editVarApplyIvaCompra}
                                  onChange={(e) => setEditVarApplyIvaCompra(e.target.checked)}
                                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                />
                                <span>¿Los costos de compra ya incluyen IVA? (Descontar Crédito Fiscal)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950 text-[11px] ml-auto">
                                <input
                                  type="checkbox"
                                  checked={editVarApplyIvaVenta}
                                  onChange={(e) => setEditVarApplyIvaVenta(e.target.checked)}
                                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                />
                                <span>+ IVA 16% a la Venta (Cobro al cliente en tienda)</span>
                              </label>
                            </div>

                            {/* Dos Columnas Simétricas: Mayor y Gran Mayor */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {/* Columna Nivel 1: Venta al Mayor */}
                              <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                  <span className="font-black text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                                    Nivel 1: Venta al Mayor
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                    Regular
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <label className="block font-bold text-slate-700 text-[11px] mb-1">
                                      Costo de Compra Mayor ($ USD) *
                                    </label>
                                    <div className="relative">
                                      <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editVarCostBase}
                                        onChange={(e) => setEditVarCostBase(e.target.value)}
                                        placeholder="ej. 10.00"
                                        className="w-full h-8 pl-7 pr-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-bold text-xs text-slate-900"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                                        Cant. Mínima Mayor *
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={editVariantForm.min_mayor}
                                        onChange={(e) => setEditVariantForm({ ...editVariantForm, min_mayor: e.target.value })}
                                        placeholder="1"
                                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-bold text-xs text-slate-900"
                                      />
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="font-bold text-slate-700 text-[11px]">
                                          Factor Divisor Mayor
                                        </label>
                                        <span className="text-[10px] font-black text-emerald-700">
                                          ÷ {computePricing(editVarCostBase, editVarApplyIvaCompra, editVarApplyIvaVenta, editVarMarginMayor, editVarMarginGranMayor, editVariantForm.min_mayor, editVariantForm.min_gran_mayor, editVarCostGranBase).factorMayorStr}
                                        </span>
                                      </div>
                                      <input
                                        type="text"
                                        value={editVarMarginMayor}
                                        onChange={(e) => setEditVarMarginMayor(e.target.value)}
                                        placeholder="0.70"
                                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-bold text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Desglose Fiscal Mayor */}
                                {parseFloat(editVarCostBase) > 0 && (() => {
                                  const p = computePricing(
                                    editVarCostBase,
                                    editVarApplyIvaCompra,
                                    editVarApplyIvaVenta,
                                    editVarMarginMayor,
                                    editVarMarginGranMayor,
                                    editVariantForm.min_mayor,
                                    editVariantForm.min_gran_mayor,
                                    editVarCostGranBase
                                  );
                                  return (
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] space-y-1">
                                      <div className="grid grid-cols-2 gap-1 text-slate-600">
                                        <span>Base Real: <strong>${p.costBaseMayor.toFixed(2)}</strong></span>
                                        <span>Crédito Fiscal: <strong className="text-emerald-700">+${p.creditoFiscalMayor.toFixed(2)}</strong></span>
                                        <span>Débito Fiscal: <strong className="text-blue-700">+${p.ivaMayor.toFixed(2)}</strong></span>
                                        <span>A pagar SENIAT: <strong className="text-purple-700">${p.ivaSeniatMayor.toFixed(2)}</strong></span>
                                      </div>
                                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] font-bold">
                                        <span className="text-slate-600">Ganancia Neta: <strong className="text-emerald-700">${p.profitMayor.toFixed(2)}</strong></span>
                                        <span className="text-slate-900">Precio Mayor: <strong className="text-emerald-800 text-xs font-black">${p.pMayor.toFixed(2)}</strong></span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Columna Nivel 2: Gran Mayor (Volumen) */}
                              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                                  <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                    Nivel 2: Gran Mayor (Volumen)
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
                                    Descuento Proveedor
                                  </span>
                                </div>

                              <div className="space-y-2">
                                <div>
                                  <label className="block font-bold text-emerald-950 text-[11px] mb-1">
                                    Costo Compra Gran Mayor ($ USD)
                                  </label>
                                  <div className="relative">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-700 absolute left-2.5 top-2.5" />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editVarCostGranBase}
                                      onChange={(e) => setEditVarCostGranBase(e.target.value)}
                                      placeholder={editVarCostBase ? `Mismo costo ($${editVarCostBase})` : "ej. 8.50"}
                                      className="w-full h-8 pl-7 pr-3 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                    />
                                  </div>
                                  <span className="text-[9px] text-emerald-700 font-medium block mt-0.5 pl-0.5">
                                    {editVarCostGranBase ? `✓ Costo especial proveedor: $${editVarCostGranBase} por paquete` : `(Si está vacío, usa el costo de Mayor: $${editVarCostBase || "0.00"})`}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block font-bold text-emerald-950 text-[11px] mb-1">
                                      Cant. Mínima Gran Mayor *
                                    </label>
                                    <input
                                      type="number"
                                      min="2"
                                      value={editVariantForm.min_gran_mayor}
                                      onChange={(e) => setEditVariantForm({ ...editVariantForm, min_gran_mayor: e.target.value })}
                                      placeholder="5"
                                      className="w-full h-8 px-2.5 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="font-bold text-emerald-950 text-[11px]">
                                        Factor Divisor Gran Mayor
                                      </label>
                                      <span className="text-[10px] font-black text-emerald-800">
                                        ÷ {computePricing(editVarCostBase, editVarApplyIvaCompra, editVarApplyIvaVenta, editVarMarginMayor, editVarMarginGranMayor, editVariantForm.min_mayor, editVariantForm.min_gran_mayor, editVarCostGranBase).factorGranStr}
                                      </span>
                                    </div>
                                    <input
                                      type="text"
                                      value={editVarMarginGranMayor}
                                      onChange={(e) => setEditVarMarginGranMayor(e.target.value)}
                                      placeholder="0.80"
                                      className="w-full h-8 px-2.5 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                    />
                                  </div>
                                </div>
                              </div>

                                {/* Desglose Fiscal Gran Mayor */}
                                {parseFloat(editVarCostBase) > 0 && (() => {
                                  const p = computePricing(
                                    editVarCostBase,
                                    editVarApplyIvaCompra,
                                    editVarApplyIvaVenta,
                                    editVarMarginMayor,
                                    editVarMarginGranMayor,
                                    editVariantForm.min_mayor,
                                    editVariantForm.min_gran_mayor,
                                    editVarCostGranBase
                                  );
                                  return (
                                    <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-300 text-[10px] space-y-1">
                                      <div className="grid grid-cols-2 gap-1 text-slate-600">
                                        <span>Base Real: <strong>${p.costBaseGran.toFixed(2)}</strong></span>
                                        <span>Crédito Fiscal: <strong className="text-emerald-700">+${p.creditoFiscalGran.toFixed(2)}</strong></span>
                                        <span>Débito Fiscal: <strong className="text-blue-700">+${p.ivaGran.toFixed(2)}</strong></span>
                                        <span>A pagar SENIAT: <strong className="text-purple-700">${p.ivaSeniatGran.toFixed(2)}</strong></span>
                                      </div>
                                      <div className="flex items-center justify-between pt-1 border-t border-emerald-100 text-[11px] font-bold">
                                        <span className="text-slate-700">Ganancia Neta: <strong className="text-emerald-700">${p.profitGran.toFixed(2)}</strong></span>
                                        <span className="text-emerald-950">Precio Gran Mayor: <strong className="text-emerald-800 text-xs font-black">${p.pGran.toFixed(2)}</strong></span>
                                      </div>
                                      {p.savingsGranMayor > 0 && (
                                        <div className="text-center pt-0.5 text-[10px] font-black text-amber-700 bg-amber-50 rounded-md py-0.5">
                                          ★ Ahorro para el cliente al comprar {p.minGM} u.: ${p.savingsGranMayor.toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Botón Aplicar Precios al SKU */}
                            {parseFloat(editVarCostBase) > 0 && (
                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const computed = computePricing(
                                      editVarCostBase,
                                      editVarApplyIvaCompra,
                                      editVarApplyIvaVenta,
                                      editVarMarginMayor,
                                      editVarMarginGranMayor,
                                      editVariantForm.min_mayor,
                                      editVariantForm.min_gran_mayor,
                                      editVarCostGranBase
                                    );
                                    if (computed.pMayor > 0) {
                                      setEditVariantForm((prev) => ({
                                        ...prev,
                                        precio_mayor_usd: computed.pMayor.toFixed(2),
                                        precio_gran_mayor_usd: computed.pGran.toFixed(2),
                                      }));
                                      showToast("¡Precios calculados aplicados a los campos del SKU!");
                                    }
                                  }}
                                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Aplicar Precios a este SKU</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Precios Mayor y Gran Mayor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-700 block">
                            Nivel 1: Venta al Mayor
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Min. Cantidad</label>
                              <input
                                type="number"
                                min="1"
                                value={editVariantForm.min_mayor}
                                onChange={(e) => setEditVariantForm({ ...editVariantForm, min_mayor: e.target.value })}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white font-bold text-xs"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Precio ($ USD) *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editVariantForm.precio_mayor_usd}
                                onChange={(e) => setEditVariantForm({ ...editVariantForm, precio_mayor_usd: e.target.value })}
                                placeholder="22.75"
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white font-black text-xs text-slate-900"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                          <span className="text-[10px] font-black uppercase text-emerald-950 block">
                            Nivel 2: Gran Mayor (Volumen)
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-emerald-800 mb-0.5">Min. Cantidad</label>
                              <input
                                type="number"
                                min="2"
                                value={editVariantForm.min_gran_mayor}
                                onChange={(e) => setEditVariantForm({ ...editVariantForm, min_gran_mayor: e.target.value })}
                                className="w-full h-8 px-2 rounded-lg border border-emerald-300 bg-white font-bold text-xs text-emerald-950"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-emerald-800 mb-0.5">Precio ($ USD) *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editVariantForm.precio_gran_mayor_usd}
                                onChange={(e) => setEditVariantForm({ ...editVariantForm, precio_gran_mayor_usd: e.target.value })}
                                placeholder="19.50"
                                className="w-full h-8 px-2 rounded-lg border border-emerald-300 bg-white font-black text-xs text-emerald-900"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingEditVariant(false);
                            setEditingVariantId(null);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingVariant}
                          className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-hover shadow-xs disabled:opacity-50"
                        >
                          {savingVariant ? "Guardando..." : "Guardar SKU"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Listado de SKUs Existentes */}
                  <div className="space-y-2.5">
                    {(editingProduct.variantes || []).map((v) => (
                      <div
                        key={v.sku}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 text-sm">
                              {v.color || "Estándar"}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {v.sku}
                            </span>
                            {v.presentacion && (
                              <span className="text-[10px] text-slate-400">
                                · {v.presentacion}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 flex items-center gap-3 flex-wrap">
                            <span>Stock: <strong className="text-slate-800">{v.stock}</strong> u.</span>
                            <span>Mayor: <strong className="text-slate-800">{formatUsd(v.precioMayorUsd || 0)}</strong> (min {v.minMayor})</span>
                            {v.precioGranMayorUsd ? (
                              <span>Gran Mayor: <strong className="text-emerald-700">{formatUsd(v.precioGranMayorUsd)}</strong> (min {v.minGranMayor})</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingEditVariant(true);
                              setEditingVariantId(v.id || null);
                              setEditVariantForm({
                                color: v.color || "",
                                sku: v.sku,
                                presentacion: v.presentacion || editingProduct.unidadVenta || "Unidad",
                                stock: String(v.stock),
                                precio_mayor_usd: v.precioMayorUsd ? String(v.precioMayorUsd) : "",
                                min_mayor: String(v.minMayor || 1),
                                precio_gran_mayor_usd: v.precioGranMayorUsd ? String(v.precioGranMayorUsd) : "",
                                min_gran_mayor: String(v.minGranMayor || 5),
                              });
                            }}
                            className="py-1 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                          >
                            Editar
                          </button>

                          {(editingProduct.variantes || []).length > 1 && v.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(v.id!, v.color || v.sku)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Eliminar este SKU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────
                  PESTAÑA 3: GALERÍA DE FOTOS Y VINCULACIÓN CON VARIANTES
                  ───────────────────────────────────────────────────────── */}
              {editActiveTab === "photos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Fotos del Carrusel ({(editingProduct.fotos || []).filter((f) => !f.url.includes("placehold.co")).length} / 10)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Elige la foto de portada ⭐ y vincula cada foto a su variante de color para la tienda.
                      </p>
                    </div>

                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-hover shadow-xs active:scale-95 transition-all">
                      <Plus className="w-4 h-4" />
                      <span>Subir Fotos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) handleUploadPhotos(editingProduct.id!, e.target.files);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {(editingProduct.fotos || []).filter((f) => !f.url.includes("placehold.co")).length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      {(editingProduct.fotos || [])
                        .filter((f) => !f.url.includes("placehold.co"))
                        .map((foto, idx, arr) => (
                          <div
                            key={foto.publicId || foto.url}
                            className={`relative rounded-2xl border p-2 bg-white transition-all shadow-2xs flex flex-col justify-between space-y-2 ${
                              foto.isPrimary
                                ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                                : "border-slate-200"
                            }`}
                          >
                            <div className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100 border border-slate-100">
                              <img src={foto.url} alt={foto.alt} className="w-full h-full object-cover" />

                              {foto.isPrimary ? (
                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                                  <Star className="w-3 h-3 fill-white" /> Portada
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryPhoto(editingProduct.id!, foto.publicId!)}
                                  className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 hover:bg-emerald-600 text-white text-[10px] font-bold opacity-90 group-hover:opacity-100 transition-opacity"
                                >
                                  Hacer Portada
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(editingProduct.id!, foto.publicId!, foto.url)}
                                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>

                              <span className="absolute bottom-1.5 right-1.5 text-[9px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                            </div>

                            {/* Botones de orden */}
                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                disabled={idx === 0 || isProcessingMedia}
                                onClick={() => handleMoveExistingPhoto(editingProduct.id!, idx, idx - 1, editingProduct.fotos)}
                                className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-700 flex items-center justify-center gap-0.5 transition-colors"
                              >
                                <ChevronLeft className="w-3 h-3" />
                                <span>Antes</span>
                              </button>
                              <button
                                type="button"
                                disabled={idx === arr.length - 1 || isProcessingMedia}
                                onClick={() => handleMoveExistingPhoto(editingProduct.id!, idx, idx + 1, editingProduct.fotos)}
                                className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-700 flex items-center justify-center gap-0.5 transition-colors"
                              >
                                <span>Después</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Selector de Variante / Color Asociado */}
                            <div className="pt-1.5 border-t border-slate-100 space-y-1">
                              <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                <Palette className="w-3 h-3 text-brand" />
                                <span>Vincular a Color / SKU:</span>
                              </label>
                              <select
                                value={foto.varianteColor || ""}
                                disabled={isProcessingMedia}
                                onChange={(e) => handleSetPhotoVariant(editingProduct.id!, foto.publicId!, e.target.value)}
                                className={`w-full text-xs font-bold py-1.5 px-2 rounded-xl border transition-colors ${
                                  foto.varianteColor
                                    ? "bg-brand/10 text-brand border-brand/30 ring-1 ring-brand/20"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                <option value="">🌐 General (Todas las variantes)</option>
                                {(editingProduct.variantes || []).map((v) => (
                                  <option key={v.sku} value={v.color}>
                                    🎨 {v.color || "Estándar"} (SKU: {v.sku})
                                  </option>
                                ))}
                              </select>
                              {foto.varianteColor && (
                                <span className="text-[9px] font-black text-brand block">
                                  ✓ Vinculada a {foto.varianteColor}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                      <span className="font-medium">No hay fotos subidas todavía para este producto.</span>
                      <label className="cursor-pointer px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-hover shadow-xs mt-1">
                        <span>Subir Fotos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files) handleUploadPhotos(editingProduct.id!, e.target.files);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Fijo */}
            <div className="p-3.5 sm:px-6 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/90 text-xs">
              <button
                type="button"
                onClick={() => handleDeleteProduct(editingProduct)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Producto</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditProduct}
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover shadow-sm disabled:opacity-50"
                >
                  {savingEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: GESTIÓN Y ELIMINACIÓN DE CATEGORÍAS
          ───────────────────────────────────────────────────────────── */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-black">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Gestión de Categorías
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Crea, administra y elimina categorías del catálogo
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Formulario para agregar nueva categoría */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-700 text-xs">
                  Crear Nueva Categoría
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryManagerInput}
                    onChange={(e) => setNewCategoryManagerInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const clean = newCategoryManagerInput.trim();
                        if (!clean) return;
                        const updatedDeleted = (theme?.deletedCategories || []).filter(
                          (c) => c.toLowerCase() !== clean.toLowerCase()
                        );
                        const updatedCustom = Array.from(
                          new Set([...(theme?.customCategories || []), clean])
                        );
                        await updateTheme({
                          deletedCategories: updatedDeleted,
                          customCategories: updatedCustom,
                        });
                        setNewCategoryManagerInput("");
                        showToast(`Categoría "${clean}" agregada con éxito`);
                      }
                    }}
                    placeholder="Nombre de la nueva categoría (ej. Vasos, Limpieza, Cajas)..."
                    className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const clean = newCategoryManagerInput.trim();
                      if (!clean) return;
                      const updatedDeleted = (theme?.deletedCategories || []).filter(
                        (c) => c.toLowerCase() !== clean.toLowerCase()
                      );
                      const updatedCustom = Array.from(
                        new Set([...(theme?.customCategories || []), clean])
                      );
                      await updateTheme({
                        deletedCategories: updatedDeleted,
                        customCategories: updatedCustom,
                      });
                      setNewCategoryManagerInput("");
                      showToast(`Categoría "${clean}" agregada con éxito`);
                    }}
                    className="h-10 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>

              {/* Lista de categorías activas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-bold text-xs">
                    Categorías Activas ({availableCategories.length})
                  </span>
                  <span className="text-[11px]">Productos asociados</span>
                </div>

                {availableCategories.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No hay categorías activas. Crea una arriba.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    {availableCategories.map((cat) => {
                      const count = products.filter((p) =>
                        (p.categoria || "")
                          .split(",")
                          .map((c) => c.trim().toLowerCase())
                          .includes(cat.toLowerCase())
                      ).length;

                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-3 sm:px-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-brand" />
                            <div>
                              <span className="font-black text-slate-800 text-xs block">
                                {cat}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {count === 0 ? "Sin productos asignados" : `${count} producto${count > 1 ? "s" : ""}`}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isProcessingCategoryDelete}
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                            title={`Eliminar categoría ${cat}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-3.5 sm:px-6 border-t border-slate-100 flex items-center justify-end bg-slate-50/80 text-xs">
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
