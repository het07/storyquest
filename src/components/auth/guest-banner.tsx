"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

const DISMISS_KEY = "sqa:guest-banner-dismissed";

export function GuestBanner() {
  const { isGuest, loading } = useAuth();
  const [dismissed, setDismissed] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (loading || !isGuest || dismissed) {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 border-b border-border/60 bg-accent/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Sparkles className="hidden size-4 shrink-0 text-primary sm:block" />
        <p className="flex-1 text-sm text-foreground">
          <span className="font-medium">You&apos;re exploring as a guest.</span>{" "}
          <span className="text-muted-foreground">
            Sign in to save your streak &amp; progress across devices.
          </span>
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="shrink-0 rounded-full">
                Save my progress
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save your progress</DialogTitle>
              <DialogDescription>
                Keep your streak, XP, and history — on every device. Your
                current guest progress carries over automatically.
              </DialogDescription>
            </DialogHeader>
            <OAuthButtons next="/dashboard" />
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
