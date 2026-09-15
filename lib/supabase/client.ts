import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getAuthRedirectUrl = (path = "/profile") => {
  let base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (typeof window !== "undefined") {
    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalHost) {
      base = `http://${window.location.hostname}${
        window.location.port ? `:${window.location.port}` : ""
      }`;
    } else {
      base = window.location.origin;
    }
  }

  return `${base}/auth/callback?next=${encodeURIComponent(path)}`;
};
