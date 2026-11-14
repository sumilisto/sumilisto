"use server";

import { cookies, headers } from "next/headers";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { verifyTotp } from "@/lib/security/totp";

const COOKIE_NAME = "sumilisto_admin_session";
const SESSION_HOURS = 8;

// Rate limiting en memoria por IP y Usuario para mitigación de ataques de fuerza bruta
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo tras 5 intentos fallidos

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET debe estar configurado en producción con al menos 16 caracteres.");
  }
  // En desarrollo local únicamente, si no está en .env.local
  return "dev-local-session-secret-at-least-32-chars-long";
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

/**
 * Indica si el doble factor de autenticación (TOTP 2FA) está configurado en el entorno
 */
export async function isTwoFactorConfigured(): Promise<boolean> {
  const secret = process.env.ADMIN_2FA_SECRET;
  return Boolean(secret && secret.trim().length >= 8);
}

export async function loginAdmin(
  username: string,
  password: string,
  twoFactorCode?: string,
  honeypot?: string
): Promise<{ ok: boolean; error?: string }> {
  // 1. Anti-bot Honeypot: si el campo trampa invisible contiene valor, bloquear silenciosamente
  if (honeypot && honeypot.trim().length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { ok: false, error: "Credenciales inválidas." };
  }

  // 2. Identificación del cliente para rate-limit (IP + Username)
  let clientIp = "127.0.0.1";
  try {
    const hdrs = await headers();
    clientIp =
      hdrs.get("cf-connecting-ip") ||
      hdrs.get("x-real-ip") ||
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
  } catch {}

  const userKey = `user:${String(username).trim().toLowerCase()}`;
  const ipKey = `ip:${clientIp}`;
  const now = Date.now();

  // Verificar si la cuenta o la IP están en período de bloqueo
  const userAttempt = loginAttempts.get(userKey);
  const ipAttempt = loginAttempts.get(ipKey);

  const activeLockout =
    userAttempt && userAttempt.lockedUntil > now
      ? userAttempt
      : ipAttempt && ipAttempt.lockedUntil > now
      ? ipAttempt
      : null;

  if (activeLockout && activeLockout.lockedUntil > now) {
    const remainingMins = Math.ceil((activeLockout.lockedUntil - now) / 60000);
    return {
      ok: false,
      error: `Demasiados intentos fallidos. Acceso bloqueado temporalmente por ${remainingMins} minuto(s).`,
    };
  }

  // 3. Credenciales desde variables de entorno estrictas (Cero contraseñas escondidas en código)
  const envUser = process.env.ADMIN_USER;
  const envPass = process.env.ADMIN_PASSWORD;

  if (!envUser || !envPass) {
    return {
      ok: false,
      error:
        "La configuración de seguridad está incompleta. Por favor configure ADMIN_USER y ADMIN_PASSWORD en las variables de entorno (.env.local).",
    };
  }

  let secret: string;
  try {
    secret = getSecret();
  } catch (err: any) {
    return {
      ok: false,
      error: "Error de configuración de seguridad en el servidor.",
    };
  }

  const userOk = safeEqual(String(username).trim().toLowerCase(), envUser.trim().toLowerCase());
  const passOk = safeEqual(String(password), envPass);

  // 4. Verificación de Doble Factor (2FA / TOTP)
  const requires2FA = await isTwoFactorConfigured();
  let twoFactorOk = true;

  if (requires2FA) {
    const twoFactorSecret = process.env.ADMIN_2FA_SECRET!.trim();
    if (!twoFactorCode || !twoFactorCode.trim()) {
      return {
        ok: false,
        error: "Se requiere el código de doble factor (2FA) de 6 dígitos generado por tu app de autenticación.",
      };
    }
    twoFactorOk = verifyTotp(twoFactorCode, twoFactorSecret);
  }

  if (!(userOk && passOk && twoFactorOk)) {
    const current = Math.max(userAttempt?.count || 0, ipAttempt?.count || 0);
    const updatedCount = current + 1;
    const isLocked = updatedCount >= MAX_ATTEMPTS;
    const lockUntil = isLocked ? now + LOCKOUT_MS : 0;

    loginAttempts.set(userKey, { count: updatedCount, lockedUntil: lockUntil });
    loginAttempts.set(ipKey, { count: updatedCount, lockedUntil: lockUntil });

    // Retardo progresivo para mitigar ataques automatizados
    const delay = Math.min(3000, 1000 + updatedCount * 350);
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (isLocked) {
      return {
        ok: false,
        error:
          "Has superado el límite de 5 intentos fallidos permitidos. Acceso bloqueado temporalmente por 15 minutos.",
      };
    }

    if (userOk && passOk && !twoFactorOk) {
      return {
        ok: false,
        error: `Código de doble factor (2FA) incorrecto o expirado. Intento ${updatedCount} de ${MAX_ATTEMPTS}.`,
      };
    }

    return {
      ok: false,
      error: `Credenciales incorrectas. Intento ${updatedCount} de ${MAX_ATTEMPTS}.`,
    };
  }

  // Éxito: restablecer intentos fallidos
  loginAttempts.delete(userKey);
  loginAttempts.delete(ipKey);

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
