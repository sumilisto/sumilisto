import { revalidateTag, revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    revalidateTag("products");
    revalidateTag("bcv");
    revalidatePath("/", "layout");
    revalidatePath("/(store)", "layout");
    return NextResponse.json({
      revalidated: true,
      message: "Caché de Google Sheets y BCV limpiado exitosamente",
      now: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { revalidated: false, error: String(err) },
      { status: 500 }
    );
  }
}
