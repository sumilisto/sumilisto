"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { saveStoreSettings } from "@/lib/actions/settings";
import { StoreSettings, DEFAULT_SETTINGS } from "@/lib/constants/settings";

interface ThemeContextType {
  theme: StoreSettings;
  updateTheme: (newTheme: Partial<StoreSettings>) => Promise<void>;
  resetTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function adjustColorBrightness(hex: string, percent: number) {
  let color = hex.replace(/^#/, '');
  if (color.length === 3) color = color[0]+color[0]+color[1]+color[1]+color[2]+color[2];
  let r = parseInt(color.substring(0,2), 16);
  let g = parseInt(color.substring(2,4), 16);
  let b = parseInt(color.substring(4,6), 16);
  r = Math.max(0, Math.min(255, Math.round(r + (r * percent / 100))));
  g = Math.max(0, Math.min(255, Math.round(g + (g * percent / 100))));
  b = Math.max(0, Math.min(255, Math.round(b + (b * percent / 100))));
  return '#' + r.toString(16).padStart(2, '0') +
               g.toString(16).padStart(2, '0') +
               b.toString(16).padStart(2, '0');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode, initialSettings: StoreSettings }> = ({ children, initialSettings }) => {
  const [theme, setTheme] = useState<StoreSettings>(initialSettings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const local = localStorage.getItem("sumilisto_theme");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setTheme((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    }
  }, []);

  const updateTheme = async (newTheme: Partial<StoreSettings>) => {
    const updated = { ...theme, ...newTheme };
    setTheme(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("sumilisto_theme", JSON.stringify(updated));
    }
    try { await saveStoreSettings(updated); } catch {}
  };

  const resetTheme = async () => {
    setTheme(DEFAULT_SETTINGS);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sumilisto_theme");
    }
    try { await saveStoreSettings(DEFAULT_SETTINGS); } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {mounted && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --theme-brand: ${theme.brandColor};
            --theme-brand-hover: ${adjustColorBrightness(theme.brandColor, 15)};
            --theme-brand-active: ${adjustColorBrightness(theme.brandColor, -15)};
          }
        `}} />
      )}
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
