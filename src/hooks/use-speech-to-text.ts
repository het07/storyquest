"use client";

import * as React from "react";

import { blobToWavBase64 } from "@/lib/voice/wav";

type Provider = "wispr" | "webspeech" | null;

interface Options {
  /** Called with the final transcript. */
  onResult?: (text: string) => void;
  /** Called with live/partial text (Web Speech only). */
  onInterim?: (text: string) => void;
}

const WISPR_ENABLED = process.env.NEXT_PUBLIC_WISPR_ENABLED === "true";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Speech-to-text with Wispr Flow as the primary provider (when enabled) and the
 * browser Web Speech API as the always-available fallback.
 *
 * - Wispr: press to record → stop → server transcription (non-streaming).
 * - Web Speech: live streaming transcript with interim results.
 */
export function useSpeechToText({ onResult, onInterim }: Options = {}) {
  const [listening, setListening] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [interim, setInterim] = React.useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = React.useRef<any>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);

  const hasWebSpeech = React.useMemo(() => !!getSpeechRecognition(), []);
  const provider: Provider = WISPR_ENABLED
    ? "wispr"
    : hasWebSpeech
      ? "webspeech"
      : null;
  const supported = provider !== null;

  const onResultRef = React.useRef(onResult);
  onResultRef.current = onResult;
  const onInterimRef = React.useRef(onInterim);
  onInterimRef.current = onInterim;

  const startWebSpeech = React.useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterim(interimText);
      onInterimRef.current?.((finalText + interimText).trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) onResultRef.current?.(text);
    };

    recognitionRef.current = recognition;
    setInterim("");
    setListening(true);
    recognition.start();
  }, []);

  const startWispr = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setListening(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;

        setProcessing(true);
        try {
          const audio = await blobToWavBase64(blob);
          const res = await fetch("/api/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio }),
          });
          if (!res.ok) throw new Error(`STT ${res.status}`);
          const data = await res.json();
          const text = String(data?.text ?? "").trim();
          if (text) onResultRef.current?.(text);
        } catch (error) {
          console.error("[stt] Wispr failed, falling back:", error);
          if (hasWebSpeech) startWebSpeech();
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      setInterim("");
      setListening(true);
      recorder.start();
    } catch (error) {
      console.error("[stt] microphone error:", error);
      setListening(false);
      if (hasWebSpeech) startWebSpeech();
    }
  }, [hasWebSpeech, startWebSpeech]);

  const start = React.useCallback(() => {
    if (listening || processing) return;
    if (provider === "wispr") void startWispr();
    else if (provider === "webspeech") startWebSpeech();
  }, [listening, processing, provider, startWispr, startWebSpeech]);

  const stop = React.useCallback(() => {
    if (provider === "webspeech") {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    } else if (provider === "wispr") {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    }
    setListening(false);
  }, [provider]);

  const toggle = React.useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  React.useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { supported, listening, processing, interim, provider, start, stop, toggle };
}
