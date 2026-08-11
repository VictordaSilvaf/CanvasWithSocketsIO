import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "[supabase] Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env"
  );
}

export const supabaseConfigured = Boolean(url && anonKey);

/** Site URL usada em e-mails / OAuth (prefer VITE_APP_URL = network). */
export function getAuthRedirectUrl() {
  const fromEnv = String(import.meta.env.VITE_APP_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;
