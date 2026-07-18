"use client";

import { useSession } from "next-auth/react";

export interface AuthState {
  user: { id?: string; name?: string | null; email?: string | null; image?: string | null } | null;
  /** Not signed in — browsing anonymously via the guest cookie. */
  isGuest: boolean;
  /** Signed in with a permanent identity (Google). */
  isAuthenticated: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const { data, status } = useSession();
  const loading = status === "loading";
  const isAuthenticated = status === "authenticated";

  return {
    user: data?.user ?? null,
    isGuest: !isAuthenticated && !loading,
    isAuthenticated,
    loading,
  };
}
