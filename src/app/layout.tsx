import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "@/styles/globals.css";
import { CartProvider } from "@/lib/cart/CartContext";
import { ProductsProvider } from "@/lib/products/ProductsContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { MobileBottomNav } from "@/components/store/MobileBottomNav";
import { FloatingCartBar } from "@/components/store/FloatingCartBar";
import { getProducts, getBcvRate } from "@/lib/api/store";
import { getStoreSettings } from "@/lib/actions/settings";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { SplashScreen } from "@/components/common/SplashScreen";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Sumilisto | Suministros y Empaques al Mayor para Restaurantes en Venezuela",
    template: "%s | Sumilisto",
  },
  description:
    "Distribución de envases térmicos, bolsas kraft, cubiertos descartables y papel parafinado para restaurantes y delivery en Caracas, Guarenas y Guatire.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://sumilisto.com"),
  manifest: "/manifest.json?v=5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sumilisto",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=6", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/icon-48.png?v=6", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-96.png?v=6", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png?v=6", sizes: "192x192", type: "image/png" },
      { url: "/icons/favicon-512.png?v=6", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png?v=6", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=6",
  },
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: "https://sumilisto.com",
    siteName: "Sumilisto",
    title: "Sumilisto | Suministros y Empaques al Mayor para Restaurantes",
    description:
      "Catálogo mayorista de envases, bolsas, cubiertos y papel para gastronomía en Venezuela. Despacho rápido y pedidos directos por WhatsApp.",
  },
  verification: {
    google: "googleabd0cc64cc0da3d2",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, bcvRate, settings] = await Promise.all([
    getProducts(), 
    getBcvRate(),
    getStoreSettings(),
  ]);
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "WholesaleStore",
    name: "Sumilisto",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://sumilisto.com",
    logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://sumilisto.com"}/logo.png`,
    description:
      "Distribución de envases térmicos, bolsas kraft, cubiertos descartables y papel parafinado al mayor para restaurantes en Caracas, Guarenas y Guatire.",
    telephone: settings.whatsappNumber ? `+${settings.whatsappNumber}` : "+584227864547",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "VE",
      addressRegion: "Miranda / Distrito Capital",
      addressLocality: "Caracas",
    },
    areaServed: [
      { "@type": "City", name: "Caracas" },
      { "@type": "City", name: "Guarenas" },
      { "@type": "City", name: "Guatire" },
      { "@type": "Country", name: "Venezuela" },
    ],
  };

  return (
    <html lang="es-VE" className={roboto.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="font-sans antialiased bg-[#f8fafc] text-slate-900 min-h-screen flex flex-col selection:bg-brand selection:text-white">
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <SplashScreen />
        <ThemeProvider initialSettings={settings}>
          <CartProvider>
            <ProductsProvider products={products} bcvRate={bcvRate}>
              <Header bcvRate={bcvRate} />
              <main className="flex-1 pb-16 sm:pb-0">{children}</main>
              <FloatingCartBar />
              <MobileBottomNav bcvRate={bcvRate} />
              <Footer />
            </ProductsProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
