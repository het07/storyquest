"use client";

import * as React from "react";

interface TtsState {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  speaking: boolean;
  loading: boolean;
  /** True when either ElevenLabs (server) or the browser synth can be used. */
  supported: boolean;
}

/**
 * Speaks text using ElevenLabs (via `/api/tts`) and transparently falls back to
 * the browser Web Speech synthesizer when the server route is unavailable.
 */
export function useTextToSpeech(): TtsState {
  const [speaking, setSpeaking] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const urlRef = React.useRef<string | null>(null);

  const browserSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (browserSupported) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setLoading(false);
  }, [browserSupported]);

  const speakWithBrowser = React.useCallback(
    (text: string) => {
      if (!browserSupported) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [browserSupported]
  );

  const speak = React.useCallback(
    async (text: string) => {
      stop();
      const clean = text?.trim();
      if (!clean) return;

      setLoading(true);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => stop();
          audio.onerror = () => {
            // If playback fails, try the browser synth instead.
            stop();
            speakWithBrowser(clean);
          };
          setLoading(false);
          setSpeaking(true);
          await audio.play();
          return;
        }
      } catch {
        // network / server error — fall through to browser synth
      }

      setLoading(false);
      speakWithBrowser(clean);
    },
    [speakWithBrowser, stop]
  );

  // Stop on unmount (covers client-side page navigation).
  React.useEffect(() => stop, [stop]);

  // Stop when the tab is hidden (tab switch / minimize) or the page is unloaded.
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
    };
  }, [stop]);

  return { speak, stop, speaking, loading, supported: browserSupported || true };
}
