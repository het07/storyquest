"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ear, Mic, Square, Volume2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useVoiceMode } from "@/components/voice/voice-mode-provider";

const HINTS = [
  "\u201cExplore black holes\u201d",
  "\u201cRead\u201d / \u201cRepeat\u201d",
  "\u201cTest me\u201d",
  "\u201cA\u201d \u00b7 \u201cB\u201d \u00b7 \u201cNext\u201d",
  "\u201cGo to dashboard\u201d",
  "\u201cStop\u201d / \u201cGoodbye\u201d",
];

/**
 * Floating, accessible status panel shown while hands-free voice mode is on.
 * Announces state via an aria-live region and mirrors what was heard.
 */
export function VoiceStatus() {
  const { enabled, listening, speaking, transcript, toggle, stopSpeaking } =
    useVoiceMode();

  const status = speaking
    ? "Speaking\u2026"
    : listening
      ? "Listening\u2026"
      : "Voice mode on";

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-4 right-4 z-[60] w-[min(92vw,20rem)] rounded-2xl border border-border/60 bg-background/95 p-4 shadow-xl backdrop-blur-xl"
          role="region"
          aria-label="Voice mode"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-white",
                  speaking
                    ? "bg-brand-gradient"
                    : listening
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/70"
                )}
              >
                {speaking ? (
                  <Volume2 className="size-4" />
                ) : listening ? (
                  <Mic className="size-4" />
                ) : (
                  <Ear className="size-4" />
                )}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{status}</p>
                <p className="text-xs text-muted-foreground">
                  Hands-free voice mode
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {speaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  aria-label="Stop speaking"
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Square className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={toggle}
                aria-label="Turn off voice mode"
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <p
            aria-live="polite"
            className="mt-3 min-h-9 rounded-lg bg-accent/60 px-3 py-2 text-sm text-foreground"
          >
            {transcript ? (
              transcript
            ) : (
              <span className="text-muted-foreground">Say a command&hellip;</span>
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {HINTS.map((hint) => (
              <span
                key={hint}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {hint}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
