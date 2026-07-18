"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AuthState {
  user: User | null;
  /** Signed in anonymously (guest). */
  isGuest: boolean;
  /** Signed in with a permanent identity (email / OAuth). */
  isAuthenticated: boolean;
  loading: boolean;
  configured: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const configured = isSupabaseConfigured();

  React.useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  const isGuest = !!user?.is_anonymous;

  return {
    user,
    isGuest,
    isAuthenticated: !!user && !user.is_anonymous,
    loading,
    configured,
  };
}
