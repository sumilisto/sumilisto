import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { CartProvider } from "@/lib/cart/CartContext";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { MobileBottomNav } from "@/components/store/MobileBottomNav";
import { FloatingCartBar } from "@/components/store/FloatingCartBar";

const inter = Inter({
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
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
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
};

export const viewport: Viewport = {
  themeColor: "#590317",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-VE" className={inter.variable}>
      <body className="font-sans antialiased bg-[#f8fafc] text-slate-900 min-h-screen flex flex-col selection:bg-[#590317] selection:text-white">
        <CartProvider>
          <Header bcvRate={42.50} />
          <main className="flex-1 pb-16 sm:pb-0">{children}</main>
          <FloatingCartBar />
          <MobileBottomNav bcvRate={42.50} />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
