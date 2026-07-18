import { createBrowserClient } from "@supabase/ssr";

/**
 * Whether Supabase env vars are present. Lets the app degrade gracefully
 * (landing page still works) before credentials are added to `.env.local`.
 */
export function isSupabaseConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
