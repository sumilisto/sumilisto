import { NextResponse } from "next/server";
import { getProducts, getBcvRate } from "@/lib/api/store";

export const revalidate = 300; // 5 minutos

export async function GET() {
  try {
    const [products, bcvRate] = await Promise.all([getProducts(), getBcvRate()]);
    return NextResponse.json({ products, bcvRate });
  } catch (error) {
    console.error("Error en API de productos:", error);
    return NextResponse.json({ products: [], bcvRate: 42.50 }, { status: 500 });
  }
}
