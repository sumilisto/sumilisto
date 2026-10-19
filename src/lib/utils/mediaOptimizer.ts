/**
 * Utilidad de optimización y compresión en el navegador para imágenes y videos de productos.
 * Mantiene la máxima fidelidad visual mientras reduce drásticamente el peso (hasta 85%).
 */

export interface OptimizedImageResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  savingsPercent: number;
}

/**
 * Comprime y redimensiona una imagen en el cliente usando Canvas y formato WebP.
 * - Max dimension: 1280px (ideal para pantallas Retina de smartphones y monitores).
 * - Calidad: 85% (sin pérdidas perceptibles de detalle o color).
 */
export async function optimizeImage(
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<OptimizedImageResult> {
  const originalSize = file.size;

  // Si no es imagen procesable por canvas (ej. SVG), devolver intacto
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      savingsPercent: 0,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Escalar manteniendo proporción
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return resolve({
            file,
            originalSize,
            optimizedSize: originalSize,
            savingsPercent: 0,
          });
        }

        // Configuración de renderizado de máxima calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar a WebP
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= originalSize) {
              // Si por alguna razón el blob comprimido fuese mayor, nos quedamos con el original
              return resolve({
                file,
                originalSize,
                optimizedSize: originalSize,
                savingsPercent: 0,
              });
            }

            const cleanBaseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
            const optimizedName = `${cleanBaseName}.webp`;
            const optimizedFile = new File([blob], optimizedName, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            const optimizedSize = blob.size;
            const savingsPercent = Math.max(
              0,
              Math.round(((originalSize - optimizedSize) / originalSize) * 100)
            );

            resolve({
              file: optimizedFile,
              originalSize,
              optimizedSize,
              savingsPercent,
            });
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => {
        resolve({
          file,
          originalSize,
          optimizedSize: originalSize,
          savingsPercent: 0,
        });
      };
    };

    reader.onerror = () => {
      resolve({
        file,
        originalSize,
        optimizedSize: originalSize,
        savingsPercent: 0,
      });
    };
  });
}

/**
 * Valida formato y tamaño máximo de video de producto (máximo recomendado: 30 MB).
 */
export function validateVideoFile(
  file: File,
  maxSizeMb = 30
): { ok: boolean; error?: string } {
  const validTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime", // .mov de iPhone
    "video/x-m4v",
    "video/ogg",
  ];

  if (!file.type.startsWith("video/") && !validTypes.includes(file.type)) {
    return {
      ok: false,
      error: "Formato no válido. Usa videos en formato MP4, WebM o MOV.",
    };
  }

  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const currentMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `El video pesa ${currentMb} MB. Para asegurar una carga ultra rápida en teléfonos y no consumir datos excesivos a tus clientes, el límite máximo es de ${maxSizeMb} MB.`,
    };
  }

  return { ok: true };
}

/**
 * Formatea bytes en cadena legible (KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
