import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/actions/auth";

export async function GET(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    const secret = request.nextUrl.searchParams.get("secret");
    const validSecret = process.env.ADMIN_SESSION_SECRET;

    if (!isAuth && (!validSecret || secret !== validSecret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    revalidateTag("products");
    revalidateTag("bcv");
    revalidatePath("/", "layout");
    revalidatePath("/(store)", "layout");
    return NextResponse.json({
      revalidated: true,
      message: "Caché de catálogo Supabase y BCV limpiado exitosamente",
      now: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { revalidated: false, error: String(err) },
      { status: 500 }
    );
  }
}
