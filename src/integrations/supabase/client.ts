import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

/** Metro/.env sometimes keeps wrapping quotes — breaks auth if URL/key are malformed */
function sanitizeEnv(value: string | undefined): string {
  if (!value) return "";
  let s = value.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

const supabaseUrl = sanitizeEnv(
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl,
);
const supabaseAnonKey = sanitizeEnv(
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabasePublishableKey,
);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}
if (!supabaseUrl.startsWith("https://")) {
  throw new Error("Invalid EXPO_PUBLIC_SUPABASE_URL (must start with https://). Check .env for stray quotes or spaces.");
}

// Some Expo environments (or if the native module hasn't been initialized yet)
// can throw "Native module is null, cannot access legacy storage".
// Supabase needs a storage adapter; we provide a safe wrapper that falls back
// to in-memory storage so the app can still run.
const memory = new Map<string, string>();
const safeStorage = {
  async getItem(key: string) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await AsyncStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  async removeItem(key: string) {
    try {
      return await AsyncStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
