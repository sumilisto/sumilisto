"use client";

import React, { createContext, useContext } from "react";
import { Product } from "@/types/product";

interface ProductsContextValue {
  products: Product[];
  bcvRate: number;
}

const ProductsContext = createContext<ProductsContextValue>({
  products: [],
  bcvRate: 42.50,
});

export function ProductsProvider({
  children,
  products,
  bcvRate,
}: {
  children: React.ReactNode;
  products: Product[];
  bcvRate: number;
}) {
  return (
    <ProductsContext.Provider value={{ products, bcvRate }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}
