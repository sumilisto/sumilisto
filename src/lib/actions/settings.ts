"use server";

import { StoreSettings, DEFAULT_SETTINGS } from "@/lib/constants/settings";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { getSettings, updateSettings } from "@/lib/supabase/queries";

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const data = await getSettings();
    if (data && Object.keys(data).length > 0) {
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (error) {
    console.error("Error reading settings from Supabase:", error);
  }
  return DEFAULT_SETTINGS;
}

export async function saveStoreSettings(settings: StoreSettings): Promise<boolean> {
  // Solo el administrador con sesión válida puede guardar cambios
  const autorizado = await isAdminAuthenticated();
  if (!autorizado) {
    console.error("Intento de guardar settings sin sesión de administrador");
    return false;
  }

  try {
    const ok = await updateSettings(settings as any);
    return ok;
  } catch (error) {
    console.error("Error saving settings to Supabase:", error);
    return false;
  }
}