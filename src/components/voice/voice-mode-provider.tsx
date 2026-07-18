"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { VoiceStatus } from "@/components/voice/voice-status";

/**
 * A voice command: when the recognized (lowercased, trimmed) transcript matches
 * `pattern`, `run` is invoked with the regex match. First match wins.
 */
export interface VoiceCommand {
  pattern: RegExp;
  run: (match: RegExpMatchArray) => void;
  description?: string;
}

interface VoiceModeContextValue {
  /** Whether hands-free mode is turned on. */
  enabled: boolean;
  /** Whether the browser supports speech recognition (STT). */
  supported: boolean;
  /** Whether the mic is actively listening right now. */
  listening: boolean;
  /** Whether TTS is currently speaking. */
  speaking: boolean;
  /** Latest heard text (interim or final) — for on-screen feedback. */
  transcript: string;
  /** Last transcript that was treated as a command. */
  lastCommand: string | null;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  /**
   * Register a set of commands under a unique id. `get` is called at match time
   * so the latest closures/state are always used. Returns an unregister fn.
   */
  registerCommands: (id: string, get: () => VoiceCommand[]) => () => void;
}

const VoiceModeContext = React.createContext<VoiceModeContextValue | null>(null);

export function useVoiceMode(): VoiceModeContextValue {
  const ctx = React.useContext(VoiceModeContext);
  if (!ctx) {
    throw new Error("useVoiceMode must be used within a VoiceModeProvider");
  }
  return ctx;
}

/**
 * Convenience hook: registers voice commands for the lifetime of the component.
 * Pass a fresh array each render — the latest one is always used at match time.
 */
export function useVoiceCommands(id: string, commands: VoiceCommand[]): void {
  const { registerCommands } = useVoiceMode();
  const ref = React.useRef(commands);
  ref.current = commands;
  React.useEffect(
    () => registerCommands(id, () => ref.current),
    [id, registerCommands]
  );
}

const STOP_SPEAK_RE = /\b(stop|quiet|silence|shut up|be quiet|enough)\b/;
const DISABLE_VOICE_RE =
  /\b(turn off (voice|hands[- ]?free)|stop listening|exit voice|goodbye|good bye|disable voice)\b/;
const STORAGE_KEY = "sqa:voice-mode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceModeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [supported, setSupported] = React.useState(false);
  const [enabled, setEnabled] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [lastCommand, setLastCommand] = React.useState<string | null>(null);

  const enabledRef = React.useRef(false);
  const speakingRef = React.useRef(false);
  const suppressRef = React.useRef(false); // pause STT while TTS speaks
  const activeRef = React.useRef(false); // recognition currently running
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = React.useRef<any>(null);
  const registryRef = React.useRef<Map<string, () => VoiceCommand[]>>(new Map());
  const lastSpokenRef = React.useRef("");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const urlRef = React.useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startRef = React.useRef<() => void>(() => {});
  const disableRef = React.useRef<() => void>(() => {});

  const browserTts =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const registerCommands = React.useCallback(
    (id: string, get: () => VoiceCommand[]) => {
      registryRef.current.set(id, get);
      return () => {
        registryRef.current.delete(id);
      };
    },
    []
  );

  /* --------------------------- Text to speech --------------------------- */

  const finishSpeaking = React.useCallback(() => {
    speakingRef.current = false;
    setSpeaking(false);
    suppressRef.current = false;
    if (enabledRef.current) startRef.current();
  }, []);

  const stopSpeaking = React.useCallback(
    (opts?: { resume?: boolean }) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      if (browserTts) window.speechSynthesis.cancel();
      speakingRef.current = false;
      setSpeaking(false);
      // Resume listening after an interrupt (e.g. user said "stop").
      // Do NOT resume when speak() is about to start a new utterance.
      if (opts?.resume) {
        suppressRef.current = false;
        if (enabledRef.current) {
          window.setTimeout(() => startRef.current(), 250);
        }
      }
    },
    [browserTts]
  );

  const speak = React.useCallback(
    async (text: string) => {
      const clean = text?.trim();
      if (!clean) return;

      stopSpeaking();
      lastSpokenRef.current = clean;

      // Pause listening so the mic doesn't transcribe our own voice.
      suppressRef.current = true;
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }

      speakingRef.current = true;
      setSpeaking(true);

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
          audio.onended = finishSpeaking;
          audio.onerror = finishSpeaking;
          await audio.play();
          return;
        }
      } catch {
        /* fall through to browser synth */
      }

      if (browserTts) {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.onend = finishSpeaking;
        utterance.onerror = finishSpeaking;
        window.speechSynthesis.speak(utterance);
      } else {
        finishSpeaking();
      }
    },
    [browserTts, finishSpeaking, stopSpeaking]
  );

  /* -------------------------- Speech to text ---------------------------- */

  const handleTranscript = React.useCallback(
    (raw: string) => {
      const t = raw
        .toLowerCase()
        .trim()
        .replace(/[.?!,]+$/, "");
      if (!t) return;
      setLastCommand(raw.trim());

      // Turn off hands-free mode entirely by voice.
      if (DISABLE_VOICE_RE.test(t)) {
        disableRef.current();
        return;
      }

      // Universal interrupt: "stop" always silences TTS (listening resumes).
      if (STOP_SPEAK_RE.test(t)) {
        if (speakingRef.current) stopSpeaking({ resume: true });
        return;
      }

      for (const get of registryRef.current.values()) {
        for (const cmd of get()) {
          const match = t.match(cmd.pattern);
          if (match) {
            try {
              cmd.run(match);
            } catch (err) {
              console.error("Voice command failed:", err);
            }
            return;
          }
        }
      }
    },
    [stopSpeaking]
  );

  const startRecognition = React.useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR || activeRef.current) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const txt = r[0]?.transcript ?? "";
        if (r.isFinal) {
          setTranscript(txt.trim());
          handleTranscript(txt);
        } else {
          interim += txt;
        }
      }
      if (interim) setTranscript(interim.trim());
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        toast.error("Microphone blocked", {
          description: "Allow mic access in your browser to use voice mode.",
        });
        enabledRef.current = false;
        setEnabled(false);
        stopSpeaking();
      }
    };

    rec.onend = () => {
      activeRef.current = false;
      setListening(false);
      // Auto-restart to keep listening (unless we're intentionally paused/off).
      if (enabledRef.current && !suppressRef.current) {
        window.setTimeout(() => startRef.current(), 300);
      }
    };

    recognitionRef.current = rec;
    activeRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      activeRef.current = false;
    }
  }, [handleTranscript, stopSpeaking]);

  React.useEffect(() => {
    startRef.current = startRecognition;
  }, [startRecognition]);

  /* ------------------------------ Toggle -------------------------------- */

  const enable = React.useCallback(() => {
    enabledRef.current = true;
    setEnabled(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    startRef.current();
    void speak(
      "Hands-free voice mode is on. Say explore, then a topic. Say read for the summary, test me for a quiz, help for all commands, or goodbye to turn me off."
    );
  }, [speak]);

  const disable = React.useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    stopSpeaking();
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    activeRef.current = false;
    setListening(false);
    setTranscript("");
  }, [stopSpeaking]);

  disableRef.current = disable;

  const toggle = React.useCallback(() => {
    if (enabledRef.current) disable();
    else enable();
  }, [disable, enable]);

  /* -------------------------- Global commands --------------------------- */

  const globalCommandsRef = React.useRef<VoiceCommand[]>([]);
  globalCommandsRef.current = React.useMemo<VoiceCommand[]>(
    () => [
      {
        pattern: /\b(help|what can i say|commands|options list)\b/,
        description: "Hear the list of commands",
        run: () =>
          void speak(
            "Here is what you can say. Explore, then a topic, to search. Read, to hear the summary. Repeat, to hear it again. Test me, to start a quiz. During a quiz, say A, B, C, or D to answer, and next for the next question. Go to dashboard, or go home, to move around. Say stop to quiet me. Say goodbye to turn voice mode off."
          ),
      },
      {
        pattern: /\b(go\s+(to\s+)?)?(dashboard|my progress|profile)\b/,
        description: "Go to your dashboard",
        run: () => {
          void speak("Opening your dashboard.");
          router.push("/dashboard");
        },
      },
      {
        pattern: /^(open |go to )?(explore|browse)$/,
        description: "Open the explore page",
        run: () => {
          void speak("Opening explore.");
          router.push("/explore");
        },
      },
      {
        pattern: /\b(go\s+(to\s+)?)?home(\s+page)?\b|take me home/,
        description: "Go to the home page",
        run: () => {
          void speak("Going home.");
          router.push("/");
        },
      },
      {
        pattern:
          /(?:search|explore|learn|find|look up|tell me about|study|teach me)(?:\s+(?:for|about))?\s+(.+)/,
        description: "Search a topic (e.g. \u201cexplore black holes\u201d)",
        run: (m) => {
          const q = m[1]?.trim();
          if (q) {
            void speak(`Searching for ${q}.`);
            router.push(`/explore?topic=${encodeURIComponent(q)}`);
          }
        },
      },
      {
        pattern: /\b(repeat|say again|read again|one more time)\b/,
        description: "Repeat the last thing spoken",
        run: () => {
          if (lastSpokenRef.current) void speak(lastSpokenRef.current);
        },
      },
      {
        pattern: /\b(sign in|log in|login)\b/,
        description: "Sign in with Google",
        run: () => {
          void speak("Opening Google sign in.");
          void import("next-auth/react").then(({ signIn }) =>
            signIn("google", { callbackUrl: "/dashboard" })
          );
        },
      },
    ],
    [router, speak]
  );

  React.useEffect(
    () => registerCommands("__global__", () => globalCommandsRef.current),
    [registerCommands]
  );

  /* ----------------------------- Lifecycle ------------------------------ */

  React.useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  // Stop talking (and pause listening) when the tab is hidden.
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopSpeaking();
        try {
          recognitionRef.current?.stop?.();
        } catch {
          /* ignore */
        }
      } else if (enabledRef.current && !suppressRef.current) {
        startRef.current();
      }
    };
    const onPageHide = () => stopSpeaking();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [stopSpeaking]);

  // Keyboard shortcut: Alt+V toggles hands-free mode (works with switch / mouth-stick assistive tech).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.altKey && (e.key === "v" || e.key === "V"))) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Clean up on unmount.
  React.useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const value = React.useMemo<VoiceModeContextValue>(
    () => ({
      enabled,
      supported,
      listening,
      speaking,
      transcript,
      lastCommand,
      toggle,
      enable,
      disable,
      speak,
      stopSpeaking: () => stopSpeaking({ resume: true }),
      registerCommands,
    }),
    [
      enabled,
      supported,
      listening,
      speaking,
      transcript,
      lastCommand,
      toggle,
      enable,
      disable,
      speak,
      stopSpeaking,
      registerCommands,
    ]
  );

  return (
    <VoiceModeContext.Provider value={value}>
      {children}
      <VoiceStatus />
    </VoiceModeContext.Provider>
  );
}
