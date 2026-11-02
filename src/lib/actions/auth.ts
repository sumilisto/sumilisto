"use server";

import { cookies } from "next/headers";
import { createHmac, createHash, timingSafeEqual } from "crypto";

const COOKIE_NAME = "sumilisto_admin_session";
const SESSION_HOURS = 8;

// Rate limiting en memoria para mitigación de ataques de fuerza bruta
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo tras 5 intentos fallidos

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET debe estar configurado en producción con al menos 16 caracteres.");
  }
  return "sumilisto-admin-session-secret-key-2026-ve";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// Comparación segura (evita ataques de temporización / timing attacks)
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const clientKey = String(username).trim().toLowerCase();
  const now = Date.now();
  const attemptRecord = loginAttempts.get(clientKey);

  // Verificar si la cuenta/usuario está temporalmente bloqueada
  if (attemptRecord && attemptRecord.lockedUntil > now) {
    const remainingMins = Math.ceil((attemptRecord.lockedUntil - now) / 60000);
    return {
      ok: false,
      error: `Demasiados intentos fallidos. Acceso bloqueado por ${remainingMins} minuto(s).`,
    };
  }

  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD || "sumilisto2024";
  const secret = getSecret();

  const userOk = safeEqual(String(username).trim().toLowerCase(), user.trim().toLowerCase());
  const passOk = safeEqual(String(password), pass);

  if (!(userOk && passOk)) {
    const current = attemptRecord && attemptRecord.lockedUntil <= now ? 0 : (attemptRecord?.count || 0);
    const updatedCount = current + 1;
    const isLocked = updatedCount >= MAX_ATTEMPTS;

    loginAttempts.set(clientKey, {
      count: updatedCount,
      lockedUntil: isLocked ? now + LOCKOUT_MS : 0,
    });

    // Pausa deliberada de 1.2 segundos para ralentizar ataques automatizados
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (isLocked) {
      return {
        ok: false,
        error: "Has superado el límite de intentos permitidos. Acceso bloqueado temporalmente por 15 minutos.",
      };
    }

    return {
      ok: false,
      error: `Usuario o contraseña incorrectos. Intento ${updatedCount} de ${MAX_ATTEMPTS}.`,
    };
  }

  // Éxito: restablecer intentos fallidos
  loginAttempts.delete(clientKey);

  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expires);
  const token = `${payload}.${sign(payload, secret)}`;

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });

  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const secret = getSecret();
    if (!secret) return false;

    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    if (!safeEqual(sign(payload, secret), signature)) return false;

    const expires = Number(payload);
    return Number.isFinite(expires) && expires > Date.now();
  } catch {
    return false;
  }
}
