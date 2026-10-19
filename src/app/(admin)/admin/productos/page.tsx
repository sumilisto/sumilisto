"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from "@/lib/actions/auth";
import { Product } from "@/types/product";
import { formatUsd } from "@/lib/currency/format";
import {
  Package, Search, Plus, Upload, Trash2, Edit3, Check, AlertCircle,
  ExternalLink, LogOut, Lock, User, RefreshCw, Image as ImageIcon,
  CheckCircle2, ArrowLeft, Filter, Sparkles, X, ChevronRight
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

  // Estados de carga individual de fotos por producto
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal para agregar producto nuevo
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: "",
    nombre: "",
    categoria: "Envases",
    presentacion: "",
    precio_mayor_usd: "",
    min_mayor: "1",
    precio_gran_mayor_usd: "",
    min_gran_mayor: "5",
    stock: "50",
    descripcion: "",
  });
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [newProductFilePreview, setNewProductFilePreview] = useState<string | null>(null);

  // Modal para edición rápida de producto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    isAdminAuthenticated().then((auth) => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) loadProducts();
    });
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
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

  // Subida de foto en 1 solo clic para un producto existente
  const handleUploadPhoto = async (productId: string, file: File, productName: string) => {
    if (!productId || !file) return;

    setUploadingProductId(productId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("producto_id", productId);
    formData.append("alt", productName);
    formData.append("is_primary", "true");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al subir la imagen");
      }

      const fotoData = await res.json();

      // Actualizar el estado local para reflejo inmediato en pantalla
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              fotos: [
                {
                  url: fotoData.url,
                  publicId: fotoData.id,
                  alt: productName,
                  isPrimary: true,
                },
                ...(p.fotos || []).filter((f) => f.url !== "https://placehold.co/600x600/f1f5f9/94a3b8?text=Sin+Foto"),
              ],
            };
          }
          return p;
        })
      );

      showToast(`¡Foto actualizada con éxito para ${productName}!`);
    } catch (err: any) {
      showToast(err.message || "No se pudo subir la foto", "error");
    } finally {
      setUploadingProductId(null);
    }
  };

  // Eliminar foto de un producto
  const handleDeletePhoto = async (productId: string, fotoId: string, storageUrl: string) => {
    if (!confirm("¿Deseas eliminar la foto de este producto?")) return;

    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto_id: fotoId, storage_url: storageUrl }),
      });

      if (!res.ok) throw new Error("Error al eliminar");

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === productId) {
            const restantes = (p.fotos || []).filter((f) => f.publicId !== fotoId && f.url !== storageUrl);
            return {
              ...p,
              fotos: restantes.length > 0 ? restantes : [
                {
                  url: "https://placehold.co/600x600/f1f5f9/94a3b8?text=Sin+Foto",
                  alt: p.nombre,
                },
              ],
            };
          }
          return p;
        })
      );

      showToast("Foto eliminada correctamente");
    } catch {
      showToast("Error al eliminar la foto", "error");
    }
  };

  // Crear producto nuevo
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.sku.trim() || !newProduct.nombre.trim()) {
      showToast("SKU y Nombre son obligatorios", "error");
      return;
    }

    setCreatingProduct(true);
    try {
      // 1. Crear producto y su variante de precios en Supabase
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear el producto");
      }

      const created = await res.json();

      // 2. Si seleccionó foto, subirla directamente
      if (newProductFile && created.id) {
        const formData = new FormData();
        formData.append("file", newProductFile);
        formData.append("producto_id", created.id);
        formData.append("alt", newProduct.nombre);
        formData.append("is_primary", "true");
        await fetch("/api/upload", { method: "POST", body: formData });
      }

      showToast(`¡Producto ${newProduct.nombre} agregado con éxito!`);
      setShowAddModal(false);
      setNewProduct({
        sku: "",
        nombre: "",
        categoria: "Envases",
        presentacion: "",
        precio_mayor_usd: "",
        min_mayor: "1",
        precio_gran_mayor_usd: "",
        min_gran_mayor: "5",
        stock: "50",
        descripcion: "",
      });
      setNewProductFile(null);
      setNewProductFilePreview(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al crear producto", "error");
    } finally {
      setCreatingProduct(false);
    }
  };

  // Guardar edición rápida
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id) return;

    setSavingEdit(true);
    try {
      const primaryVar = editingProduct.variantes?.[0];
      const payload = {
        nombre: editingProduct.nombre,
        categoria: editingProduct.categoria,
        unidad_venta: editingProduct.unidadVenta,
        activo: editingProduct.activo,
        variantes: primaryVar
          ? [
              {
                id: (primaryVar as any).id,
                sku: editingProduct.sku,
                presentacion: editingProduct.presentacion,
                precio_mayor_usd: Number(editingProduct.precioMayorUsd) || 0,
                min_mayor: Number(editingProduct.minMayor) || 1,
                precio_gran_mayor_usd: Number(editingProduct.precioGranMayorUsd) || 0,
                min_gran_mayor: Number(editingProduct.minGranMayor) || 5,
                stock: Number(editingProduct.stock) || 0,
                activo: editingProduct.activo,
              },
            ]
          : undefined,
      };

      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al guardar cambios");

      showToast("Producto actualizado correctamente");
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || "Error al actualizar", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtrado reactivo en pantalla
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Búsqueda por texto (nombre o SKU)
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());

      // Categoría
      const matchesCategory =
        selectedCategory === "todas" ||
        p.categoria.toLowerCase() === selectedCategory.toLowerCase();

      // Filtro sin foto
      const hasRealPhoto =
        p.fotos &&
        p.fotos.length > 0 &&
        !p.fotos[0]?.url.includes("placehold.co");

      const matchesPhotoFilter = !filterNoPhoto || !hasRealPhoto;

      return matchesSearch && matchesCategory && matchesPhotoFilter;
    });
  }, [products, searchQuery, selectedCategory, filterNoPhoto]);

  // Conteo de estadísticas
  const stats = useMemo(() => {
    const total = products.length;
    const conFoto = products.filter(
      (p) => p.fotos && p.fotos.length > 0 && !p.fotos[0]?.url.includes("placehold.co")
    ).length;
    const sinFoto = total - conFoto;
    return { total, conFoto, sinFoto };
  }, [products]);

  // Pantalla de carga mientras se valida la sesión
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  // Pantalla de login si no está autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald-100 text-brand rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Package className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-800">Panel de Administración</h1>
            <p className="text-xs text-slate-500 mt-1">Gestión de Catálogo y Fotos Sumilisto</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-slate-50"
                  placeholder="admin"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-slate-50"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {loggingIn ? "Entrando..." : "Acceder al Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Toast flotante de confirmación */}
      {feedbackMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-800 text-white border-emerald-700"
              : "bg-rose-700 text-white border-rose-600"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Barra superior de navegación del Administrador */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 text-slate-400 hover:text-brand hover:bg-slate-50 rounded-xl transition-colors"
              title="Volver a la tienda"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand" />
                Gestor de Productos y Fotos
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Sube fotos en 1 clic y administra tu catálogo en Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/carritos"
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors hidden md:inline-flex items-center gap-1.5"
            >
              <span>🛒 Carritos</span>
            </Link>

            <Link
              href="/admin/settings"
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors hidden md:inline-flex items-center gap-1.5"
            >
              <span>⚙️ Configuración</span>
            </Link>

            <button
              onClick={() => setShowAddModal(true)}
              className="h-9 px-3.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tarjetas de Estadísticas Rápidas */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Sin Foto
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-800 mt-1 block">
              {stats.sinFoto}
            </span>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código SKU..."
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

            {/* Interruptor de filtro: Sin Foto */}
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

          {/* Chips de Categorías */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((p) => {
              const mainPhoto = p.fotos && p.fotos.length > 0 ? p.fotos[0] : null;
              const hasRealPhoto = mainPhoto && !mainPhoto.url.includes("placehold.co");
              const isUploadingThis = uploadingProductId === p.id;

              return (
                <div
                  key={p.sku}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Zona Superior: Foto y Botón de Subida Rápida */}
                    <div className="relative w-full h-44 bg-slate-100 border-b border-slate-100 flex items-center justify-center overflow-hidden group">
                      {hasRealPhoto ? (
                        <img
                          src={mainPhoto.url}
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

                      {/* Estado de carga de foto */}
                      {isUploadingThis && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white mb-2" />
                          <span className="text-xs font-bold">Subiendo a Supabase...</span>
                        </div>
                      )}

                      {/* Botón flotante para cambiar/subir foto en 1 solo clic */}
                      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingThis}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && p.id) {
                                handleUploadPhoto(p.id, file, p.nombre);
                              }
                            }}
                            className="hidden"
                          />
                          <span className="w-full py-2 px-3 bg-white/95 hover:bg-white text-slate-800 hover:text-brand font-bold text-xs rounded-xl shadow-md backdrop-blur-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200/80 active:scale-95">
                            <Upload className="w-3.5 h-3.5 text-brand" />
                            <span>{hasRealPhoto ? "Cambiar foto" : "Subir foto"}</span>
                          </span>
                        </label>

                        {hasRealPhoto && p.id && mainPhoto?.publicId && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(p.id!, mainPhoto.publicId!, mainPhoto.url)}
                            title="Eliminar foto"
                            className="p-2 bg-white/95 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl shadow-md border border-slate-200/80 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Badge de categoría */}
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                        {p.categoria}
                      </span>
                    </div>

                    {/* Zona Media: Datos del Producto */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
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

                      <p className="text-[11px] text-slate-500">
                        {p.presentacion || p.unidadVenta || "Paquete"}
                      </p>

                      {/* Precios y Stock */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
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
                  <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-2 border-t border-slate-100/80">
                    <span className="text-[11px] text-slate-500">
                      Stock: <strong className="text-slate-800">{p.stock}</strong> u.
                    </span>

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
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: Agregar Nuevo Producto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand" /> Agregar Nuevo Producto
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Código SKU *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="Ej: ENV-ALUM-010"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Categoría</label>
                  <select
                    value={newProduct.categoria}
                    onChange={(e) => setNewProduct({ ...newProduct, categoria: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="Envases">Envases</option>
                    <option value="Bolsas">Bolsas</option>
                    <option value="Cubiertos">Cubiertos</option>
                    <option value="Papel">Papel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={newProduct.nombre}
                  onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                  placeholder="Ej: Envase Rectangular 1000cc con Tapa"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Presentación / Paquete</label>
                <input
                  type="text"
                  value={newProduct.presentacion}
                  onChange={(e) => setNewProduct({ ...newProduct, presentacion: e.target.value })}
                  placeholder="Ej: Caja de 250 u."
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-200/70">
                  <span className="text-xs font-bold text-slate-700 block">Tarifa Mayor ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.precio_mayor_usd}
                    onChange={(e) => setNewProduct({ ...newProduct, precio_mayor_usd: e.target.value })}
                    placeholder="25.00"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>Mínimo:</span>
                    <input
                      type="number"
                      value={newProduct.min_mayor}
                      onChange={(e) => setNewProduct({ ...newProduct, min_mayor: e.target.value })}
                      className="w-14 h-7 px-1.5 text-center rounded border border-slate-200 text-xs bg-white"
                    />
                    <span>u.</span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 p-3 rounded-xl space-y-2 border border-emerald-200/70">
                  <span className="text-xs font-bold text-emerald-800 block">Tarifa Gran Mayor ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.precio_gran_mayor_usd}
                    onChange={(e) => setNewProduct({ ...newProduct, precio_gran_mayor_usd: e.target.value })}
                    placeholder="22.50"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold text-emerald-900"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                    <span>Mínimo:</span>
                    <input
                      type="number"
                      value={newProduct.min_gran_mayor}
                      onChange={(e) => setNewProduct({ ...newProduct, min_gran_mayor: e.target.value })}
                      className="w-14 h-7 px-1.5 text-center rounded border border-slate-200 text-xs bg-white"
                    />
                    <span>u.</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Stock Disponible</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Foto del Producto</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewProductFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setNewProductFilePreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand/10 file:text-brand hover:file:bg-brand/20"
                  />
                </div>
              </div>

              {newProductFilePreview && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 mx-auto">
                  <img src={newProductFilePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50"
                >
                  {creatingProduct ? "Guardando en Supabase..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edición Rápida de Producto */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-brand" /> Editar Producto
                </h3>
                <span className="text-[11px] font-mono text-slate-400">{editingProduct.sku}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={editingProduct.nombre}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Categoría</label>
                  <select
                    value={editingProduct.categoria}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoria: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="Envases">Envases</option>
                    <option value="Bolsas">Bolsas</option>
                    <option value="Cubiertos">Cubiertos</option>
                    <option value="Papel">Papel</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Presentación</label>
                  <input
                    type="text"
                    value={editingProduct.presentacion || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, presentacion: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-200/70">
                  <span className="text-xs font-bold text-slate-700 block">Tarifa Mayor ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.precioMayorUsd || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, precioMayorUsd: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white font-bold"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>Mínimo:</span>
                    <input
                      type="number"
                      value={editingProduct.minMayor || 1}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, minMayor: parseInt(e.target.value) || 1 })
                      }
                      className="w-14 h-7 px-1.5 text-center rounded border border-slate-200 text-xs bg-white"
                    />
                    <span>u.</span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 p-3 rounded-xl space-y-2 border border-emerald-200/70">
                  <span className="text-xs font-bold text-emerald-800 block">Tarifa Gran Mayor ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.precioGranMayorUsd || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, precioGranMayorUsd: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white font-bold text-emerald-900"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                    <span>Mínimo:</span>
                    <input
                      type="number"
                      value={editingProduct.minGranMayor || 5}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, minGranMayor: parseInt(e.target.value) || 5 })
                      }
                      className="w-14 h-7 px-1.5 text-center rounded border border-slate-200 text-xs bg-white"
                    />
                    <span>u.</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Stock (unidades)</label>
                  <input
                    type="number"
                    value={editingProduct.stock || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />
                </div>
                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.activo}
                      onChange={(e) => setEditingProduct({ ...editingProduct, activo: e.target.checked })}
                      className="w-4 h-4 rounded text-brand focus:ring-brand/20"
                    />
                    <span className="text-xs font-bold text-slate-700">Producto Activo en Tienda</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50"
                >
                  {savingEdit ? "Actualizando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
