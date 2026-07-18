"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UpgradeFormProps {
  onSuccess?: () => void;
}

/**
 * Links an email + password to the current (anonymous) user, preserving the
 * same user id and all existing history / progress.
 */
export function UpgradeForm({ onSuccess }: UpgradeFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    onSuccess?.();
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Almost there!</p>
        <p className="mt-1 text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Confirm
          it to finish securing your account — your progress is already saved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="upgrade-email">Email</Label>
        <Input
          id="upgrade-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="upgrade-password">Password</Label>
        <Input
          id="upgrade-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Create my account
      </Button>
    </form>
  );
}
