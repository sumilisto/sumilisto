import { NextRequest, NextResponse } from "next/server";
import { getResolvedBcvRate, updateSupabaseBcv, fetchBcvDirect, fetchDolarApiMirror } from "@/lib/currency/bcv";
import { revalidateTag } from "next/cache";

// GET /api/bcv — Obtiene o fuerza actualización de la tasa BCV oficial
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (forceRefresh) {
      // Intentar refrescar en vivo
      let liveRate = await fetchBcvDirect();
      let source = "bcv.org.ve";

      if (!liveRate) {
        liveRate = await fetchDolarApiMirror();
        source = "ve.dolarapi.com";
      }

      if (liveRate) {
        await updateSupabaseBcv(liveRate);
        revalidateTag("bcv");
        return NextResponse.json({
          ok: true,
          rate: liveRate,
          source,
          updated_at: new Date().toISOString(),
          message: "Tasa BCV sincronizada con éxito",
        });
      }
    }

    const rate = await getResolvedBcvRate();
    return NextResponse.json({
      ok: true,
      rate,
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST /api/bcv — Permite ajustar manualmente la tasa desde el panel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rate = Number(body.rate);

    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json({ ok: false, error: "Tasa inválida" }, { status: 400 });
    }

    const ok = await updateSupabaseBcv(rate);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Error guardando en Supabase" }, { status: 500 });
    }

    revalidateTag("bcv");
    return NextResponse.json({ ok: true, rate, message: "Tasa BCV actualizada" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
