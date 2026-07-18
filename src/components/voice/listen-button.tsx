"use client";

import { Loader2, Square, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

export function ListenButton({
  text,
  label = "Listen",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { speak, stop, speaking, loading, supported } = useTextToSpeech();

  if (!supported || !text.trim()) return null;

  const active = speaking || loading;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => (active ? stop() : void speak(text))}
      className={cn("gap-2 rounded-full", className)}
      aria-label={active ? "Stop narration" : "Listen to this summary"}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : speaking ? (
        <Square className="size-4" />
      ) : (
        <Volume2 className="size-4" />
      )}
      {loading ? "Loading…" : speaking ? "Stop" : label}
    </Button>
  );
}
