import { NextResponse } from "next/server";

/**
 * Sanitiza cualquier error para asegurar que NUNCA se exponga información interna
 * del servidor, nombres de tablas de base de datos, trazas de pila (stack traces) o credenciales.
 */
export function sanitizeErrorMessage(error: unknown, fallbackMessage = "No se pudo procesar la solicitud."): string {
  if (!error) return fallbackMessage;

  // Registrar el error real de forma segura en los logs internos del servidor (stdout)
  console.error("[SERVER_SECURITY_LOG] Internal Error:", error);

  // Si estamos en desarrollo, podemos permitir mensajes amigables no sensibles
  if (process.env.NODE_ENV === "development") {
    if (typeof error === "string") return error;
    if (error instanceof Error) {
      // Filtrar términos de infraestructura interna
      const raw = error.message;
      if (
        raw.includes("supabase") ||
        raw.includes("postgres") ||
        raw.includes("connection") ||
        raw.includes("password") ||
        raw.includes("key") ||
        raw.includes("relation") ||
        raw.includes("column")
      ) {
        return "Error en la consulta de datos interna.";
      }
      return raw;
    }
  }

  // En producción, SIEMPRE devolver mensaje genérico y seguro
  return fallbackMessage;
}

export function createSafeErrorResponse(
  error: unknown,
  fallbackMessage = "No se pudo procesar la solicitud. Por favor intente más tarde.",
  statusCode = 500,
  includeOkFalse = false
): NextResponse {
  const safeMessage = sanitizeErrorMessage(error, fallbackMessage);
  const body = includeOkFalse ? { ok: false, error: safeMessage } : { error: safeMessage };
  return NextResponse.json(body, { status: statusCode });
}

