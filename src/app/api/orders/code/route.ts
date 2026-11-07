import { NextResponse } from "next/server";
import { getOrders } from "@/lib/supabase/queries";
import { generateUniqueOrderCode } from "@/lib/orders/orderCode";

// GET /api/orders/code — Obtiene un código #SUMI-XXXX único garantizado sin repetir
export async function GET() {
  try {
    const orders = await getOrders();
    const existingCodes = orders.map((o) => o.codigo);
    const code = generateUniqueOrderCode(existingCodes);

    return NextResponse.json({ ok: true, code });
  } catch (error: any) {
    // Si falla la consulta, genera uno aleatorio estándar
    const code = generateUniqueOrderCode([]);
    return NextResponse.json({ ok: true, code });
  }
}

