import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateUniqueOrderCode } from "@/lib/orders/orderCode";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

// GET /api/orders/code — Obtiene un código #SUMI-XXXX único garantizado sin repetir
export async function GET(req: NextRequest) {
  try {
    // Blindaje contra ataques de saturación / DoS: máximo 25 códigos por minuto por IP
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`order_code:${clientIp}`, 25, 60 * 1000);
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intenta de nuevo en un minuto." },
        { status: 429 }
      );
    }

    // Consulta ultraliviana: solo la columna 'codigo' en vez de toda la tabla de pedidos
    const { data } = await supabaseAdmin
      .from("pedidos")
      .select("codigo")
      .limit(3000);

    const existingCodes = (data || []).map((o: any) => o.codigo).filter(Boolean);
    const code = generateUniqueOrderCode(existingCodes);

    return NextResponse.json({ ok: true, code });
  } catch (error: any) {
    // Si falla la consulta, genera uno aleatorio estándar
    const code = generateUniqueOrderCode([]);
    return NextResponse.json({ ok: true, code });
  }
}

