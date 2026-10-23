import { NextRequest, NextResponse } from "next/server";
import {
  uploadProductPhoto,
  deleteProductPhoto,
  uploadProductVideo,
  deleteProductVideo,
  setPrimaryPhoto,
  setPhotoVariant,
  reorderProductPhotos,
} from "@/lib/supabase/queries";
import { revalidateTag } from "next/cache";

// POST /api/upload — Subir foto o video de producto
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    // Acción para reordenar fotos
    if (action === "reorder") {
      const photoIdsRaw = formData.get("photo_ids") as string;
      if (!photoIdsRaw) {
        return NextResponse.json({ error: "Falta photo_ids" }, { status: 400 });
      }
      const photoIds = JSON.parse(photoIdsRaw);
      await reorderProductPhotos(photoIds);
      revalidateTag("products");
      return NextResponse.json({ ok: true });
    }

    // Acción para marcar foto como portada principal
    if (action === "set-primary") {
      const productoId = formData.get("producto_id") as string;
      const fotoId = formData.get("foto_id") as string;
      if (!productoId || !fotoId) {
        return NextResponse.json({ error: "Falta producto_id o foto_id" }, { status: 400 });
      }
      const updated = await setPrimaryPhoto(productoId, fotoId);
      revalidateTag("products");
      return NextResponse.json(updated);
    }

    // Acción para asociar foto a una variante de color específica (o dejarla general)
    if (action === "set-variant") {
      const fotoId = formData.get("foto_id") as string;
      const varianteColor = (formData.get("variante_color") as string) || null;
      if (!fotoId) {
        return NextResponse.json({ error: "Falta foto_id" }, { status: 400 });
      }
      const updated = await setPhotoVariant(fotoId, varianteColor);
      revalidateTag("products");
      return NextResponse.json(updated);
    }

    const file = formData.get("file") as File;
    const productoId = formData.get("producto_id") as string;
    const mediaType = (formData.get("type") as string) || (file?.type.startsWith("video/") ? "video" : "photo");

    if (!file || !productoId) {
      return NextResponse.json(
        { error: "Se requiere un archivo y producto_id" },
        { status: 400 }
      );
    }

    // Subida de VIDEO
    if (mediaType === "video") {
      const videoResult = await uploadProductVideo(productoId, file, file.name);
      revalidateTag("products");
      return NextResponse.json(videoResult, { status: 201 });
    }

    // Subida de FOTO (hasta 10 fotos)
    const alt = (formData.get("alt") as string) || "";
    const orden = parseInt((formData.get("orden") as string) || "0", 10);
    const isPrimary = formData.get("is_primary") === "true";
    const varianteColor = (formData.get("variante_color") as string) || undefined;

    const foto = await uploadProductPhoto(productoId, file, file.name, {
      alt,
      orden,
      isPrimary,
      varianteColor,
    });

    revalidateTag("products");
    return NextResponse.json(foto, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/upload — Eliminar foto o video de producto
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, producto_id, foto_id, storage_url } = body;

    // Eliminar VIDEO
    if (tipo === "video") {
      if (!producto_id) {
        return NextResponse.json({ error: "Se requiere producto_id" }, { status: 400 });
      }
      await deleteProductVideo(producto_id, storage_url);
      revalidateTag("products");
      return NextResponse.json({ ok: true });
    }

    // Eliminar FOTO
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
