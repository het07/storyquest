"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

interface OAuthButtonsProps {
  /** Whether the current user is an anonymous guest (link vs. fresh sign-in). */
  isGuest?: boolean;
  /** Where to land after auth completes. */
  next?: string;
  className?: string;
}

export function OAuthButtons({
  isGuest = false,
  next = "/dashboard",
  className,
}: OAuthButtonsProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next
    )}`;

    // Guests: link Google to the SAME user id so progress is preserved.
    // Fresh visitors: standard OAuth sign-in.
    const { data, error } = isGuest
      ? await supabase.auth.linkIdentity({
          provider: "google",
          options: { redirectTo },
        })
      : await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });

    if (error) {
      // linkIdentity requires "Manual Linking" enabled; fall back to sign-in.
      if (isGuest) {
        const fallback = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (fallback.data?.url) {
          window.location.href = fallback.data.url;
          return;
        }
      }
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={loading}
        onClick={signInWithGoogle}
      >
        <GoogleIcon className="size-4" />
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
