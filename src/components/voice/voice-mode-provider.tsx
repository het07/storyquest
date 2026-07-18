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
/** Open-ended search phrases — wait for a short pause so the topic is complete. */
const OPEN_ENDED_SEARCH_RE =
  /(?:search|explore|learn|find|look up|tell me about|teach me)(?:\s+(?:for|about))?\s+.+|\bstudy\s+(?!in\s+depth\b).+/;
const STORAGE_KEY = "sqa:voice-mode";
/** Restart recognition almost immediately — keep the loop feeling live. */
const RESTART_MS = 0;
/** Min interim chars before we treat speech as a barge-in interrupt. */
const BARGE_IN_CHARS = 2;
/**
 * Act this long after interim text stops changing — much faster than waiting
 * for the Web Speech API's `isFinal` (often 700ms–1.5s after you finish).
 */
const INTERIM_COMMIT_MS = 220;
/** Ignore duplicate finals / re-hears of the same command. */
const DEDUPE_MS = 1600;

function normalizeVoiceText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ignore STT that is just hearing our own TTS through the speakers. */
function isLikelyEcho(heard: string, spoken: string): boolean {
  const h = normalizeVoiceText(heard);
  const s = normalizeVoiceText(spoken);
  if (!h || !s || h.length < 2) return false;
  if (s.includes(h)) return true;
  const hw = h.split(" ").filter(Boolean);
  const sw = new Set(s.split(" ").filter(Boolean));
  if (hw.length === 0) return false;
  let overlap = 0;
  for (const w of hw) if (sw.has(w)) overlap += 1;
  return overlap / hw.length >= 0.65;
}

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
  const activeRef = React.useRef(false); // recognition currently running
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = React.useRef<any>(null);
  const registryRef = React.useRef<Map<string, () => VoiceCommand[]>>(new Map());
  const lastSpokenRef = React.useRef("");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const urlRef = React.useRef<string | null>(null);
  const restartTimerRef = React.useRef<number | null>(null);
  const interimCommitTimerRef = React.useRef<number | null>(null);
  const pendingInterimRef = React.useRef("");
  const lastHandledRef = React.useRef<{ text: string; at: number }>({
    text: "",
    at: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startRef = React.useRef<() => void>(() => {});
  const disableRef = React.useRef<() => void>(() => {});
  const handleTranscriptRef = React.useRef<(raw: string) => void>(() => {});

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

  const scheduleListen = React.useCallback((delay = RESTART_MS) => {
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (enabledRef.current) startRef.current();
    }, delay);
  }, []);

  /* --------------------------- Text to speech --------------------------- */

  const finishSpeaking = React.useCallback(() => {
    speakingRef.current = false;
    setSpeaking(false);
    // Mic should already be open for barge-in; only restart if it dropped.
    if (enabledRef.current && !activeRef.current) scheduleListen(0);
  }, [scheduleListen]);

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
      if (opts?.resume !== false && enabledRef.current && !activeRef.current) {
        scheduleListen(0);
      }
    },
    [browserTts, scheduleListen]
  );

  const bargeIn = React.useCallback(() => {
    if (!speakingRef.current) return;
    // Cut TTS immediately so the user is heard without waiting for the end.
    stopSpeaking({ resume: false });
    if (enabledRef.current && !activeRef.current) scheduleListen(0);
  }, [scheduleListen, stopSpeaking]);

  const speak = React.useCallback(
    async (text: string) => {
      const clean = text?.trim();
      if (!clean) return;

      stopSpeaking({ resume: false });
      lastSpokenRef.current = clean;
      speakingRef.current = true;
      setSpeaking(true);

      // Keep the mic open while speaking so the user can interrupt (barge-in).
      if (enabledRef.current && !activeRef.current) scheduleListen(0);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });
        // User may have barged in while we waited on the network.
        if (!speakingRef.current) return;

        if (res.ok) {
          const blob = await res.blob();
          if (!speakingRef.current) return;
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

      if (!speakingRef.current) return;

      if (browserTts) {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.onend = finishSpeaking;
        utterance.onerror = finishSpeaking;
        window.speechSynthesis.speak(utterance);
      } else {
        finishSpeaking();
      }
    },
    [browserTts, finishSpeaking, scheduleListen, stopSpeaking]
  );

  /* -------------------------- Speech to text ---------------------------- */

  const matchesAnyCommand = React.useCallback((t: string) => {
    if (DISABLE_VOICE_RE.test(t) || STOP_SPEAK_RE.test(t)) return true;
    // Page-specific commands first (registered after global).
    const getters = [...registryRef.current.values()].reverse();
    for (const get of getters) {
      for (const cmd of get()) {
        if (cmd.pattern.test(t)) return true;
      }
    }
    return false;
  }, []);

  /** Short / fully-anchored commands can run on the first solid interim match. */
  const isSnapReady = React.useCallback(
    (t: string) => {
      if (!t || !matchesAnyCommand(t)) return false;
      // Still collecting a topic — wait for pause (stability timer).
      if (OPEN_ENDED_SEARCH_RE.test(t)) return false;
      const words = t.split(" ").filter(Boolean);
      if (words.length > 5) return false;
      for (const get of [...registryRef.current.values()].reverse()) {
        for (const cmd of get()) {
          const src = cmd.pattern.source;
          if (src.startsWith("^") && src.endsWith("$") && cmd.pattern.test(t)) {
            return true;
          }
        }
      }
      // Common short controls (substring patterns, whole utterance is short).
      return words.length <= 4;
    },
    [matchesAnyCommand]
  );

  const wasRecentlyHandled = React.useCallback((t: string) => {
    const prev = lastHandledRef.current;
    if (!prev.text || Date.now() - prev.at > DEDUPE_MS) return false;
    if (t === prev.text) return true;
    // Final often equals or lightly extends the interim we already acted on.
    if (t.startsWith(prev.text) && t.length - prev.text.length <= 12) return true;
    if (prev.text.startsWith(t) && prev.text.length - t.length <= 8) return true;
    return false;
  }, []);

  const clearInterimCommit = React.useCallback(() => {
    if (interimCommitTimerRef.current) {
      window.clearTimeout(interimCommitTimerRef.current);
      interimCommitTimerRef.current = null;
    }
    pendingInterimRef.current = "";
  }, []);

  const handleTranscript = React.useCallback(
    (raw: string) => {
      const t = normalizeVoiceText(raw).replace(/[.?!,]+$/g, "");
      if (!t) return;

      // Ignore speaker bleed from our own TTS.
      if (isLikelyEcho(t, lastSpokenRef.current)) return;
      if (wasRecentlyHandled(t)) return;

      // User spoke while we were talking — cut audio, then handle the command.
      if (speakingRef.current) bargeIn();

      // Only mark handled if we actually run something (or a universal control).
      const markHandled = () => {
        lastHandledRef.current = { text: t, at: Date.now() };
        setLastCommand(raw.trim());
        clearInterimCommit();
      };

      // Turn off hands-free mode entirely by voice.
      if (DISABLE_VOICE_RE.test(t)) {
        markHandled();
        disableRef.current();
        return;
      }

      // Universal interrupt: "stop" silences TTS (listening stays on).
      if (STOP_SPEAK_RE.test(t)) {
        markHandled();
        stopSpeaking({ resume: true });
        return;
      }

      // Prefer page-specific commands over global (e.g. "study in depth").
      for (const get of [...registryRef.current.values()].reverse()) {
        for (const cmd of get()) {
          const match = t.match(cmd.pattern);
          if (match) {
            markHandled();
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
    [bargeIn, clearInterimCommit, stopSpeaking, wasRecentlyHandled]
  );

  React.useEffect(() => {
    handleTranscriptRef.current = handleTranscript;
  }, [handleTranscript]);

  const scheduleInterimCommit = React.useCallback(
    (raw: string) => {
      const t = normalizeVoiceText(raw).replace(/[.?!,]+$/g, "");
      if (!t || isLikelyEcho(t, lastSpokenRef.current)) return;
      if (!matchesAnyCommand(t)) return;

      pendingInterimRef.current = raw.trim();

      // Snap: quiz letters, "next", "stop", etc. — act immediately.
      if (isSnapReady(t)) {
        clearInterimCommit();
        handleTranscriptRef.current(raw);
        return;
      }

      // Open-ended / longer phrases: commit shortly after speech stops changing.
      if (interimCommitTimerRef.current) {
        window.clearTimeout(interimCommitTimerRef.current);
      }
      interimCommitTimerRef.current = window.setTimeout(() => {
        interimCommitTimerRef.current = null;
        const pending = pendingInterimRef.current;
        pendingInterimRef.current = "";
        if (pending) handleTranscriptRef.current(pending);
      }, INTERIM_COMMIT_MS);
    },
    [clearInterimCommit, isSnapReady, matchesAnyCommand]
  );

  const startRecognition = React.useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR || activeRef.current || !enabledRef.current) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const txt = r[0]?.transcript ?? "";
        if (r.isFinal) {
          setTranscript(txt.trim());
          clearInterimCommit();
          handleTranscript(txt);
        } else {
          interim += txt;
        }
      }
      if (interim) {
        const trimmed = interim.trim();
        setTranscript(trimmed);
        // Barge-in as soon as we hear the user start talking (interim),
        // without waiting for the final transcript.
        if (
          speakingRef.current &&
          trimmed.length >= BARGE_IN_CHARS &&
          !isLikelyEcho(trimmed, lastSpokenRef.current)
        ) {
          bargeIn();
        }
        // Act on stable interim — don't wait for slow `isFinal`.
        scheduleInterimCommit(trimmed);
      }
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
        stopSpeaking({ resume: false });
        return;
      }
      // "aborted" / "no-speech" are normal — restart quickly below via onend.
    };

    rec.onend = () => {
      activeRef.current = false;
      setListening(false);
      if (enabledRef.current) scheduleListen(RESTART_MS);
    };

    recognitionRef.current = rec;
    activeRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      activeRef.current = false;
      if (enabledRef.current) scheduleListen(RESTART_MS);
    }
  }, [
    bargeIn,
    clearInterimCommit,
    handleTranscript,
    scheduleInterimCommit,
    scheduleListen,
    stopSpeaking,
  ]);

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
      "Voice mode on. Speak anytime to interrupt. Say explore, then a topic — or study in depth."
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
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    clearInterimCommit();
    stopSpeaking({ resume: false });
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    activeRef.current = false;
    setListening(false);
    setTranscript("");
  }, [clearInterimCommit, stopSpeaking]);

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
            "Commands: explore a topic. Read. Study in depth. Career path. Test me. A B C or D in a quiz. Next. Dashboard. Home. Stop. Goodbye."
          ),
      },
      {
        pattern: /\b(go\s+(to\s+)?)?(dashboard|my progress|profile)\b/,
        description: "Go to your dashboard",
        run: () => {
          router.push("/dashboard");
        },
      },
      {
        pattern: /^(open |go to )?(explore|browse)$/,
        description: "Open the explore page",
        run: () => {
          router.push("/explore");
        },
      },
      {
        pattern: /\b(go\s+(to\s+)?)?home(\s+page)?\b|take me home/,
        description: "Go to the home page",
        run: () => {
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
            // Navigate immediately — no spoken delay before the search starts.
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

  // Stop talking when the tab is hidden; resume listening when visible again.
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopSpeaking({ resume: false });
        try {
          recognitionRef.current?.stop?.();
        } catch {
          /* ignore */
        }
      } else if (enabledRef.current) {
        scheduleListen(0);
      }
    };
    const onPageHide = () => stopSpeaking({ resume: false });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [scheduleListen, stopSpeaking]);

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
      enabledRef.current = false;
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (interimCommitTimerRef.current) {
        window.clearTimeout(interimCommitTimerRef.current);
        interimCommitTimerRef.current = null;
      }
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
      stopSpeaking({ resume: false });
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
