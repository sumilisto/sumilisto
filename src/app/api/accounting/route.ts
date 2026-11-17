import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { getAccountingData } from "@/lib/supabase/queries";
import { createSafeErrorResponse } from "@/lib/security/errors";

export async function GET() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await getAccountingData();
    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    return createSafeErrorResponse(error, "No se pudieron obtener los datos contables.", 500, true);
  }
}
