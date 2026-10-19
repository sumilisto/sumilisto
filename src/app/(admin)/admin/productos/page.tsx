"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import { Product, ProductVariant } from "@/types/product";
import { formatUsd } from "@/lib/currency/format";
import { optimizeImage, validateVideoFile, formatFileSize } from "@/lib/utils/mediaOptimizer";
import {
  Package, Search, Plus, Upload, Trash2, Edit3, Check, AlertCircle,
  ExternalLink, LogOut, Lock, User, RefreshCw, Image as ImageIcon,
  CheckCircle2, ArrowLeft, Filter, Sparkles, X, ChevronRight,
  Video, Play, Star, Palette, Layers, Film
} from "lucide-react";

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

  // Notificaciones flotantes
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Modal: Gestión Multimedia (Fotos y Video)
  const [mediaProduct, setMediaProduct] = useState<Product | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaStatusText, setMediaStatusText] = useState("");
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

  // Modal: Agregar Producto Nuevo
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: "",
    nombre: "",
    categoria: "Envases",
    color: "ESTÁNDAR",
    presentacion: "Unidad",
    precio_mayor_usd: "",
    min_mayor: "1",
    precio_gran_mayor_usd: "",
    min_gran_mayor: "5",
    stock: "100",
    descripcion: "",
  });
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductVideo, setNewProductVideo] = useState<File | null>(null);

  // Modal: Edición Rápida de Producto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) loadProducts();
    });
  }, []);

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
  // CREACIÓN DE PRODUCTO NUEVO
  // ─────────────────────────────────────────────────────────
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.sku.trim() || !newProduct.nombre.trim()) {
      showToast("SKU y Nombre son obligatorios", "error");
      return;
    }

    setCreatingProduct(true);
    try {
      // 1. Crear producto en Supabase con su variante inicial
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear producto");
      }

      const created = await res.json();

      // 2. Si adjuntó fotos, subirlas optimizadas
      if (newProductFiles.length > 0 && created.id) {
        for (let i = 0; i < newProductFiles.length; i++) {
          const opt = await optimizeImage(newProductFiles[i], 1280, 0.85);
          const formData = new FormData();
          formData.append("file", opt.file);
          formData.append("producto_id", created.id);
          formData.append("alt", newProduct.nombre);
          formData.append("is_primary", i === 0 ? "true" : "false");
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

      showToast(`¡Producto ${newProduct.nombre} creado con éxito!`);
      setShowAddModal(false);
      setNewProduct({
        sku: "",
        nombre: "",
        categoria: "Envases",
        color: "ESTÁNDAR",
        presentacion: "Unidad",
        precio_mayor_usd: "",
        min_mayor: "1",
        precio_gran_mayor_usd: "",
        min_gran_mayor: "5",
        stock: "100",
        descripcion: "",
      });
      setNewProductFiles([]);
      setNewProductVideo(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al crear producto", "error");
    } finally {
      setCreatingProduct(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // EDICIÓN BÁSICA DE PRODUCTO
  // ─────────────────────────────────────────────────────────
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.id) return;

    setSavingEdit(true);
    try {
      const primaryVar = editingProduct.variantes?.[0];
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
          variantes: primaryVar ? [
            {
              id: primaryVar.id,
              precio_mayor_usd: editingProduct.precioMayorUsd,
              min_mayor: editingProduct.minMayor,
              precio_gran_mayor_usd: editingProduct.precioGranMayorUsd,
              min_gran_mayor: editingProduct.minGranMayor,
              stock: editingProduct.stock,
            }
          ] : undefined,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar cambios");

      showToast("Producto actualizado");
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    } finally {
      setSavingEdit(false);
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
        p.categoria.toLowerCase() === selectedCategory.toLowerCase();

      const hasValidPhoto = (p.fotos || []).some(
        (f) => !f.url.includes("placehold.co")
      );
      const matchesNoPhoto = filterNoPhoto ? !hasValidPhoto : true;

      return matchesSearch && matchesCategory && matchesNoPhoto;
    });
  }, [products, searchQuery, selectedCategory, filterNoPhoto]);

  const stats = useMemo(() => {
    const total = products.length;
    const conFoto = products.filter((p) =>
      (p.fotos || []).some((f) => !f.url.includes("placehold.co"))
    ).length;
    const conVideo = products.filter((p) => Boolean(p.videoUrl)).length;
    const sinFoto = total - conFoto;
    return { total, conFoto, conVideo, sinFoto };
  }, [products]);

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
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
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

      {/* Encabezado Principal y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-1 text-xs">
            <Link
              href="/admin/settings"
              className="font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ajustes Tienda
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/admin/carritos"
              className="font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors"
            >
              Carritos Abandonados
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/"
              target="_blank"
              className="font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors"
            >
              Ver Tienda <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

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
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="space-y-6">
        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            <button
              onClick={() => setFilterNoPhoto(!filterNoPhoto)}
              className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                filterNoPhoto
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{filterNoPhoto ? "Mostrando: Sin Foto" : "Filtrar: Sin Foto"}</span>
            </button>
          </div>

          {/* Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {["todas", "Envases", "Bolsas", "Cubiertos", "Papel"].map((cat) => (
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
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
                        <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                          {p.categoria}
                        </span>
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

                      {/* Botón rápido para abrir gestor multimedia */}
                      <div className="absolute bottom-3 inset-x-3 z-10">
                        <button
                          type="button"
                          onClick={() => setMediaProduct(p)}
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
                            onClick={() => handleOpenVariantsModal(p)}
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
                        onClick={() => setEditingProduct(p)}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Editar</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
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

            {/* Estado de procesamiento en vivo */}
            {isProcessingMedia && (
              <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/20 flex items-center gap-3 text-brand">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand" />
                <span className="text-xs font-bold">{mediaStatusText || "Procesando multimedia..."}</span>
              </div>
            )}

            {/* SECCIÓN 1: FOTOS (Máx 10) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-brand" />
                  <span>Fotos del Carrusel ({mediaProduct.fotos?.filter(f => !f.url.includes("placehold.co")).length || 0} / 10)</span>
                </h4>

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
                    }
                  }}
                  className="hidden"
                  id="media-photos-input"
                />
                <label
                  htmlFor="media-photos-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-hover shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Subir Fotos</span>
                </label>
              </div>

              {/* Grid de Fotos Actuales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {(mediaProduct.fotos || [])
                  .filter((f) => !f.url.includes("placehold.co"))
                  .map((foto, idx) => (
                    <div
                      key={foto.publicId || foto.url}
                      className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs space-y-1.5 flex flex-col justify-between"
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

                      {/* Selector de Variante / Color Asociado */}
                      <div className="space-y-0.5">
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
                  <div className="col-span-2 sm:col-span-5 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    No hay fotos subidas todavía. Toca &ldquo;Subir Fotos&rdquo; para agregar fotos directamente desde tu galería.
                  </div>
                )}
              </div>
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

            <div className="flex justify-end pt-2 border-t border-slate-100">
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
          MODAL: GESTOR DE VARIANTES DE PRODUCTO
          ───────────────────────────────────────────────────────── */}
      {variantProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-brand uppercase tracking-wider block">
                  Colores y Variantes
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  {variantProduct.nombre}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configura cada color o presentación con su propio stock y precios.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVariantProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Listado de Variantes Actuales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Variantes Registradas ({(variantProduct.variantes || []).length})
                </span>

                {!isAddingVariant && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingVariant(true);
                      setEditingVariant(null);
                      setVariantForm({
                        color: "",
                        sku: `${variantProduct.sku}-${(variantProduct.variantes || []).length + 1}`,
                        presentacion: variantProduct.unidadVenta || "50 Und",
                        stock: "100",
                        precio_mayor_usd: variantProduct.precioMayorUsd ? String(variantProduct.precioMayorUsd) : "",
                        min_mayor: String(variantProduct.minMayor || 1),
                        precio_gran_mayor_usd: variantProduct.precioGranMayorUsd ? String(variantProduct.precioGranMayorUsd) : "",
                        min_gran_mayor: String(variantProduct.minGranMayor || 5),
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand-hover shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Color / Variante</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(variantProduct.variantes || []).map((v) => (
                  <div
                    key={v.sku}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-xs sm:text-sm">
                          {v.color || "Estándar"}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {v.sku}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
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
                          setEditingVariant(v);
                          setIsAddingVariant(true);
                          setVariantForm({
                            color: v.color || "",
                            sku: v.sku,
                            presentacion: v.presentacion || "",
                            stock: String(v.stock),
                            precio_mayor_usd: v.precioMayorUsd ? String(v.precioMayorUsd) : "",
                            min_mayor: String(v.minMayor || 1),
                            precio_gran_mayor_usd: v.precioGranMayorUsd ? String(v.precioGranMayorUsd) : "",
                            min_gran_mayor: String(v.minGranMayor || 5),
                          });
                        }}
                        className="py-1 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                      >
                        Editar
                      </button>
                      {(variantProduct.variantes || []).length > 1 && v.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(v.id!, v.color || v.sku)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FORMULARIO AGREGAR / EDITAR VARIANTE */}
            {isAddingVariant && (
              <form
                onSubmit={handleSaveVariant}
                className="p-4 rounded-2xl bg-white border-2 border-brand/30 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand">
                    {editingVariant ? `Editando Variante: ${editingVariant.color}` : "Nueva Variante de Color"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingVariant(false);
                      setEditingVariant(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Color / Nombre de Variante * (ej. Rojo, Dorado)
                    </label>
                    <input
                      type="text"
                      value={variantForm.color}
                      onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                      placeholder="Dorado"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Código SKU Único * (ej. DOY-DOR-250)
                    </label>
                    <input
                      type="text"
                      value={variantForm.sku}
                      onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                      placeholder="DOY-DOR-250"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Stock Disponible (unidades)</label>
                    <input
                      type="number"
                      value={variantForm.stock}
                      onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Presentación (ej. 50 Und)</label>
                    <input
                      type="text"
                      value={variantForm.presentacion}
                      onChange={(e) => setVariantForm({ ...variantForm, presentacion: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Precio al Mayor ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={variantForm.precio_mayor_usd}
                      onChange={(e) => setVariantForm({ ...variantForm, precio_mayor_usd: e.target.value })}
                      placeholder="22.75"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Precio Gran Mayor ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={variantForm.precio_gran_mayor_usd}
                      onChange={(e) => setVariantForm({ ...variantForm, precio_gran_mayor_usd: e.target.value })}
                      placeholder="41.20"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold text-emerald-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingVariant}
                    className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-hover shadow-xs disabled:opacity-50"
                  >
                    {savingVariant ? "Guardando..." : "Guardar Variante"}
                  </button>
                </div>
              </form>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVariantProduct(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: NUEVO PRODUCTO
          ───────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Agregar Nuevo Producto</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="DOY-ROJ-250"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={newProduct.categoria}
                    onChange={(e) => setNewProduct({ ...newProduct, categoria: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  >
                    <option value="Envases">Envases</option>
                    <option value="Bolsas">Bolsas</option>
                    <option value="Cubiertos">Cubiertos</option>
                    <option value="Papel">Papel</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Producto *</label>
                  <input
                    type="text"
                    value={newProduct.nombre}
                    onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                    placeholder="Bolsa para Café 250Gr con Ziplock + Válvula"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color Inicial (ej. Rojo o Estándar)</label>
                  <input
                    type="text"
                    value={newProduct.color}
                    onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                    placeholder="Rojo"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Presentación (ej. 50 Und)</label>
                  <input
                    type="text"
                    value={newProduct.presentacion}
                    onChange={(e) => setNewProduct({ ...newProduct, presentacion: e.target.value })}
                    placeholder="50 Und"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Precio al Mayor ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.precio_mayor_usd}
                    onChange={(e) => setNewProduct({ ...newProduct, precio_mayor_usd: e.target.value })}
                    placeholder="22.75"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Precio Gran Mayor ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.precio_gran_mayor_usd}
                    onChange={(e) => setNewProduct({ ...newProduct, precio_gran_mayor_usd: e.target.value })}
                    placeholder="41.20"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mínimo Mayor (unidades)</label>
                  <input
                    type="number"
                    value={newProduct.min_mayor}
                    onChange={(e) => setNewProduct({ ...newProduct, min_mayor: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Subida opcional de fotos iniciales */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fotos Iniciales (hasta 10 fotos se optimizarán automáticamente)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setNewProductFiles(Array.from(e.target.files).slice(0, 10));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer"
                />
                {newProductFiles.length > 0 && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">
                    ✓ {newProductFiles.length} foto(s) seleccionada(s)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-hover shadow-sm disabled:opacity-50"
                >
                  {creatingProduct ? "Creando..." : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: EDICIÓN RÁPIDA DE PRODUCTO
          ───────────────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Editar Información del Producto</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingProduct.nombre}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={editingProduct.categoria}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoria: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  >
                    <option value="Envases">Envases</option>
                    <option value="Bolsas">Bolsas</option>
                    <option value="Cubiertos">Cubiertos</option>
                    <option value="Papel">Papel</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidad de Venta</label>
                  <input
                    type="text"
                    value={editingProduct.unidadVenta}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unidadVenta: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={editingProduct.descripcionLarga || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, descripcionLarga: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.activo}
                    onChange={(e) => setEditingProduct({ ...editingProduct, activo: e.target.checked })}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <span className="font-bold text-slate-700">Producto Activo en tienda</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.destacado || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, destacado: e.target.checked })}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <span className="font-bold text-slate-700">Destacado</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover shadow-sm disabled:opacity-50"
                >
                  {savingEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
