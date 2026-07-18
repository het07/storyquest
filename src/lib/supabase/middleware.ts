import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and, if the visitor
 * has no session yet, transparently creates an anonymous (guest) session so
 * the app is immediately usable with no login wall.
 *
 * No-ops gracefully when Supabase env vars are not configured.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() validates the token against Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest mode: bootstrap an anonymous session for brand-new visitors.
  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  return supabaseResponse;
}
