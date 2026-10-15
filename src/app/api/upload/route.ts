import { NextRequest, NextResponse } from "next/server";
import { uploadProductPhoto, deleteProductPhoto } from "@/lib/supabase/queries";
import { revalidateTag } from "next/cache";

// POST /api/upload — Subir foto de producto
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const productoId = formData.get("producto_id") as string;
    const alt = (formData.get("alt") as string) || "";
    const orden = parseInt((formData.get("orden") as string) || "0", 10);
    const isPrimary = formData.get("is_primary") === "true";

    if (!file || !productoId) {
      return NextResponse.json(
        { error: "Se requiere un archivo y producto_id" },
        { status: 400 }
      );
    }

    const foto = await uploadProductPhoto(productoId, file, file.name, {
      alt,
      orden,
      isPrimary,
    });

    revalidateTag("products");
    return NextResponse.json(foto, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/upload — Eliminar foto de producto
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { foto_id, storage_url } = body;

    if (!foto_id || !storage_url) {
      return NextResponse.json(
        { error: "Se requiere foto_id y storage_url" },
        { status: 400 }
      );
    }

    await deleteProductPhoto(foto_id, storage_url);
    revalidateTag("products");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
