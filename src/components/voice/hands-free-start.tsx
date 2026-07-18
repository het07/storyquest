"use client";

import { Mic, Keyboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useVoiceMode } from "@/components/voice/voice-mode-provider";

/**
 * Large, accessible entry point into hands-free voice mode for learners who
 * cannot use a mouse/keyboard. One activation (click, tap, or Alt+V) grants
 * mic permission; after that the session is voice-driven.
 */
export function HandsFreeStart({ className }: { className?: string }) {
  const { enabled, supported, enable, toggle } = useVoiceMode();

  if (!supported) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Hands-free voice needs a browser with speech recognition (Chrome or Edge
        recommended).
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-fuchsia-500/[0.05] p-5 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Hands-free learning</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No hands needed after you start. Search, listen, and take quizzes entirely
            by voice — designed for learners who cannot use a keyboard or mouse.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="size-3.5" />
            Shortcut: <kbd className="rounded border border-border px-1.5 py-0.5 font-mono">Alt</kbd>
            +
            <kbd className="rounded border border-border px-1.5 py-0.5 font-mono">V</kbd>
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => (enabled ? toggle() : enable())}
          aria-pressed={enabled}
          className={cn(
            "shrink-0 gap-2 rounded-full",
            enabled && "bg-brand-gradient text-white hover:opacity-90"
          )}
        >
          <Mic className="size-5" />
          {enabled ? "Voice mode on" : "Start hands-free"}
        </Button>
      </div>
    </div>
  );
}
