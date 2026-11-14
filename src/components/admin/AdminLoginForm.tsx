"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Lock, User, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, Clock } from "lucide-react";
import { loginAdmin, isTwoFactorConfigured } from "@/lib/actions/auth";
import { useTheme } from "@/lib/theme/ThemeContext";

interface AdminLoginFormProps {
  onLoginSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({
  onLoginSuccess,
  title = "Panel Administrativo",
  subtitle = "Acceso seguro con protección anti-fuerza bruta y doble factor",
}) => {
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const formMountTime = useRef(Date.now());

  useEffect(() => {
    isTwoFactorConfigured().then((has2FA) => setRequires2FA(has2FA));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Detección anti-bot por tiempo mínimo humano (menos de 800ms indica script)
    const elapsed = Date.now() - formMountTime.current;
    if (elapsed < 800 && !honeypot) {
      await new Promise((r) => setTimeout(r, 1000));
      setErrorMsg("Solicitud rechazada por seguridad.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginAdmin(username, password, twoFactorCode, honeypot);
      if (res.ok) {
        onLoginSuccess();
      } else {
        setErrorMsg(res.error || "Credenciales incorrectas.");
      }
    } catch {
      setErrorMsg("Error de conexión al verificar credenciales.");
    } finally {
      setLoading(false);
    }
  };

  const brandColor = theme.brandColor || "#15803D";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Cabecera del formulario */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs mb-3">
            {theme.logoUrl ? (
              <div className="relative w-10 h-10">
                <Image src={theme.logoUrl} alt="Logo" fill className="object-contain" />
              </div>
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">{subtitle}</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Campo Honeypot invisible para atrapar bots */}
          <div style={{ display: "none" }} aria-hidden="true">
            <label htmlFor="hp_security_check">Ignore this field</label>
            <input
              id="hp_security_check"
              type="text"
              name="hp_security_check"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Usuario Administrador
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Campo de Doble Factor 2FA */}
          {requires2FA && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Código 2FA (6 dígitos)
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Google Auth / TOTP
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-center"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Ingresa el código temporal de 6 dígitos de tu app de autenticación.
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs uppercase tracking-wider bg-emerald-800 hover:bg-emerald-900 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Ingresar de Forma Segura</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Máximo 5 intentos · Bloqueo de 15 min · SSL / HTTPS
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

