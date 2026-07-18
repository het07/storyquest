"use client";

import * as React from "react";
import { Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useVoiceMode } from "@/components/voice/voice-mode-provider";

/**
 * Navbar toggle for hands-free voice mode. One click enables continuous voice
 * control (this click also satisfies the browser's mic-permission gesture).
 */
export function VoiceModeToggle() {
  const { enabled, supported, listening, toggle } = useVoiceMode();

  if (!supported) return null;

  return (
    <Button
      variant={enabled ? "default" : "ghost"}
      size="icon"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn off voice mode" : "Turn on hands-free voice mode"}
      title={enabled ? "Voice mode on (Alt+V)" : "Hands-free voice mode (Alt+V)"}
      className={cn(
        "relative rounded-full",
        enabled && "bg-brand-gradient text-white hover:opacity-90"
      )}
    >
      {enabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
      {enabled && listening && (
        <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
      )}
    </Button>
  );
}
