"use client";

import { Loader2, Mic, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSpeechToText } from "@/hooks/use-speech-to-text";

export function MicButton({
  onTranscript,
  onInterim,
  disabled,
  className,
}: {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { supported, listening, processing, toggle } = useSpeechToText({
    onResult: onTranscript,
    onInterim,
  });

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? "default" : "ghost"}
      size="icon"
      onClick={toggle}
      disabled={disabled || processing}
      aria-label={listening ? "Stop voice input" : "Search with your voice"}
      title={listening ? "Stop" : "Search with your voice"}
      className={cn(
        "relative shrink-0 rounded-xl",
        listening &&
          "bg-brand-gradient text-white after:absolute after:inset-0 after:animate-ping after:rounded-xl after:bg-primary/40 after:content-['']",
        className
      )}
    >
      {processing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : listening ? (
        <Square className="relative z-10 size-4" />
      ) : (
        <Mic className="size-4" />
      )}
    </Button>
  );
}
