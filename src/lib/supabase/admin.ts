import { createClient } from "@supabase/supabase-js";

// Cliente Supabase con permisos de administrador (service_role)
// SOLO usar en el servidor (API Routes, Server Actions) — NUNCA en el navegador
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
