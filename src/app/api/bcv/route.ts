import { NextRequest, NextResponse } from "next/server";
import {
  getResolvedBcvDetails,
  fetchBcvOfficialDirect,
  saveBcvToSupabase,
} from "@/lib/currency/bcv";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { revalidateTag } from "next/cache";

// GET /api/bcv — Consulta la tasa oficial directamente de bcv.org.ve
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Solo un administrador autenticado puede forzar el raspado directo y escritura en BD
    if (forceRefresh && (await isAdminAuthenticated())) {
      const direct = await fetchBcvOfficialDirect();

      if (direct.rate && direct.rate > 0) {
        await saveBcvToSupabase(direct.rate, direct.fechaValor, true, null);
        revalidateTag("bcv");

        return NextResponse.json({
          ok: true,
          rate: direct.rate,
          isOfficialOnline: true,
          fechaValor: direct.fechaValor,
          source: "https://www.bcv.org.ve/",
          message: `Sincronizado con éxito directamente de bcv.org.ve (${direct.fechaValor || "Hoy"})`,
        });
      } else {
        // La página oficial está caída o no respondió
        const fallbackDetails = await getResolvedBcvDetails();
        return NextResponse.json({
          ok: true,
          rate: fallbackDetails.rate,
          isOfficialOnline: false,
          fechaValor: fallbackDetails.fechaValor,
          source: "database_last_update",
          notice: `⚠️ El portal oficial https://www.bcv.org.ve/ no respondió. Se mantiene la última actualización generada (${fallbackDetails.fechaValor || fallbackDetails.lastSyncAt}).`,
          error: direct.error || "No se pudo conectar con bcv.org.ve",
        });
      }
    }

    const details = await getResolvedBcvDetails();
    return NextResponse.json({
      ok: true,
      ...details,
      source: details.isOfficialOnline ? "https://www.bcv.org.ve/" : "database_last_update",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST /api/bcv — Permite ajustar manualmente la tasa si se requiere
export async function POST(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const rate = Number(body.rate);

    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json({ ok: false, error: "Tasa inválida" }, { status: 400 });
    }

    const ok = await saveBcvToSupabase(rate, "Ajuste manual", false, "Sobreescrito manualmente");
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Error guardando en base de datos" }, { status: 500 });
    }

    revalidateTag("bcv");
    return NextResponse.json({ ok: true, rate, message: "Tasa BCV guardada correctamente" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
