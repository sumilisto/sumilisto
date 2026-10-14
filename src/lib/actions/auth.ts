"use server";

import { cookies } from "next/headers";
import { createHmac, createHash, timingSafeEqual } from "crypto";

const COOKIE_NAME = "sumilisto_admin_session";
const SESSION_HOURS = 8;

function getSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// Comparación segura (evita revelar información por tiempos de respuesta)
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  const secret = getSecret();

  if (!user || !pass || !secret) {
    return {
      ok: false,
      error: "El acceso de administrador no está configurado en el servidor.",
    };
  }

  const userOk = safeEqual(String(username).trim().toLowerCase(), user.trim().toLowerCase());
  const passOk = safeEqual(String(password), pass);

  if (!(userOk && passOk)) {
    // Pausa breve para frenar intentos repetidos
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { ok: false, error: "Usuario o contraseña incorrectos" };
  }

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
}