"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { CartStorageData, CartStorageItem, CartStatus } from "@/types/cart";

const CART_STORAGE_KEY = "sumilisto_cart_v1";
const CART_EXPIRATION_MS = 48 * 60 * 60 * 1000; // 48 horas en milisegundos

interface CartContextType {
  items: CartStorageItem[];
  itemCount: number;
  status: CartStatus;
  updatedAt: number;
  whatsappSentAt?: number;
  isExpired: boolean;
  getItemQuantity: (sku: string) => number;
  addItem: (sku: string, quantity?: number) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clearCart: () => void;
  markAsSentWhatsApp: () => void;
  hoursRemaining: number;
}

const CartContext = createContext<CartContextType | null>(null);

function getInitialStorage(): CartStorageData {
  if (typeof window === "undefined") {
    return { items: [], updatedAt: Date.now(), status: "activo" };
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return { items: [], updatedAt: Date.now(), status: "activo" };
    }
    const parsed: CartStorageData = JSON.parse(raw);
    const now = Date.now();
    const referenceTime = Math.max(parsed.updatedAt || 0, parsed.whatsappSentAt || 0);

    // Si pasaron más de 48 horas, se vacía automáticamente
    if (now - referenceTime > CART_EXPIRATION_MS) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return { items: [], updatedAt: now, status: "activo" };
    }

    return parsed;
  } catch {
    // Modo incógnito o sin acceso a localStorage
    return { items: [], updatedAt: Date.now(), status: "activo" };
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartData, setCartData] = useState<CartStorageData>({
    items: [],
    updatedAt: Date.now(),
    status: "activo",
  });
  const [mounted, setMounted] = useState(false);

  // Carga inicial y sincronización entre pestañas
  useEffect(() => {
    setMounted(true);
    const initial = getInitialStorage();
    setCartData(initial);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setCartData(updated);
        } catch {
          // Ignorar error de parsing
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const saveToStorage = useCallback((data: CartStorageData) => {
    setCartData(data);
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Tolera localStorage no disponible
    }
  }, []);

  const addItem = useCallback(
    (sku: string, quantity = 1) => {
      setCartData((prev) => {
        const existingIndex = prev.items.findIndex((item) => item.sku === sku);
        let newItems: CartStorageItem[];

        if (existingIndex >= 0) {
          newItems = [...prev.items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            cantidad: newItems[existingIndex].cantidad + quantity,
          };
        } else {
          newItems = [...prev.items, { sku, cantidad: quantity }];
        }

        const updated: CartStorageData = {
          items: newItems,
          updatedAt: Date.now(),
          status: "activo",
          whatsappSentAt: prev.whatsappSentAt,
        };

        try {
          window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
        } catch {}

        return updated;
      });
    },
    []
  );

  const updateQuantity = useCallback(
    (sku: string, quantity: number) => {
      setCartData((prev) => {
        let newItems: CartStorageItem[];
        if (quantity <= 0) {
          newItems = prev.items.filter((item) => item.sku !== sku);
        } else {
          newItems = prev.items.map((item) =>
            item.sku === sku ? { ...item, cantidad: quantity } : item
          );
        }

        const updated: CartStorageData = {
          items: newItems,
          updatedAt: Date.now(),
          status: "activo",
          whatsappSentAt: prev.whatsappSentAt,
        };

        try {
          window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
        } catch {}

        return updated;
      });
    },
    []
  );

  const removeItem = useCallback(
    (sku: string) => {
      setCartData((prev) => {
        const newItems = prev.items.filter((item) => item.sku !== sku);
        const updated: CartStorageData = {
          items: newItems,
          updatedAt: Date.now(),
          status: "activo",
          whatsappSentAt: prev.whatsappSentAt,
        };
        try {
          window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  const clearCart = useCallback(() => {
    const empty: CartStorageData = {
      items: [],
      updatedAt: Date.now(),
      status: "activo",
    };
    saveToStorage(empty);
  }, [saveToStorage]);

  const markAsSentWhatsApp = useCallback(() => {
    setCartData((prev) => {
      const updated: CartStorageData = {
        ...prev,
        whatsappSentAt: Date.now(),
        status: "enviado_whatsapp",
      };
      try {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const getItemQuantity = useCallback(
    (sku: string) => {
      const found = cartData.items.find((item) => item.sku === sku);
      return found ? found.cantidad : 0;
    },
    [cartData.items]
  );

  const referenceTime = Math.max(cartData.updatedAt || 0, cartData.whatsappSentAt || 0);
  const now = mounted ? Date.now() : 0;
  const elapsed = now - referenceTime;
  const isExpired = elapsed > CART_EXPIRATION_MS;
  const hoursRemaining = Math.max(0, Math.floor((CART_EXPIRATION_MS - elapsed) / (1000 * 60 * 60)));

  const itemCount = cartData.items.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        items: cartData.items,
        itemCount,
        status: cartData.status,
        updatedAt: cartData.updatedAt,
        whatsappSentAt: cartData.whatsappSentAt,
        isExpired,
        getItemQuantity,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        markAsSentWhatsApp,
        hoursRemaining,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe ser usado dentro de un CartProvider");
  }
  return context;
}
