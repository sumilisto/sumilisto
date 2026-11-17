import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { getLiveUsdtRate } from "@/lib/currency/usdt";

export async function GET() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const liveData = await getLiveUsdtRate();

    return NextResponse.json({
      ok: true,
      data: liveData,
    });
  } catch (error) {
    console.error("Error al obtener tasa USDT en vivo:", error);
    return NextResponse.json(
      { ok: false, error: "Error consultando tasa en vivo" },
      { status: 500 }
    );
  }
}
