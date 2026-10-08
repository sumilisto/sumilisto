"use server";

import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export interface StoreSettings {
  brandColor: string;
  logoUrl: string | null;
  whatsappNumber: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  brandColor: "#590317",
  logoUrl: null,
  whatsappNumber: "584227894547", // Default number
};

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    if (!fs.existsSync(path.join(process.cwd(), "data"))) {
      fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
    }
    
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error("Error reading settings", error);
  }
  return DEFAULT_SETTINGS;
}

export async function saveStoreSettings(settings: StoreSettings): Promise<boolean> {
  try {
    if (!fs.existsSync(path.join(process.cwd(), "data"))) {
      fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error saving settings", error);
    return false;
  }
}
