/**
 * Energy-based Voice Activity Detector used for barge-in.
 *
 * While the assistant is speaking (TTS), the Web Speech recognizer mostly hears
 * our own audio coming back through the speakers, so relying on it to notice the
 * user talking is slow and unreliable. Instead we open a dedicated microphone
 * stream with echo cancellation enabled and watch its energy level: the browser
 * subtracts the speaker output, so what's left is (mostly) the user's real
 * voice. When sustained energy crosses a threshold we fire `onSpeech` so the
 * caller can cut the TTS immediately.
 */

export interface VadController {
  /** Acquire mic + audio graph. Call from a user gesture (e.g. enabling voice). */
  prime: () => Promise<boolean>;
  /** Start one-shot monitoring; `onSpeech` fires once when the user speaks. */
  start: (onSpeech: () => void) => void;
  /** Pause monitoring (keeps the stream/graph alive for fast re-arming). */
  stop: () => void;
  /** Tear everything down and release the mic. */
  dispose: () => void;
  /** Whether the mic + analyser are ready. */
  readonly ready: boolean;
}

interface VadOptions {
  /** Normalized RMS (0–1) above which a frame counts as voiced. */
  threshold?: number;
  /** Consecutive voiced frames required before firing (debounces clicks/pops). */
  minVoicedFrames?: number;
  /**
   * Grace period (ms) after `start()` before detection arms, letting the echo
   * canceller converge so the TTS onset doesn't trigger a false barge-in.
   */
  warmupMs?: number;
}

function getAudioContext(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.AudioContext || w.webkitAudioContext || null;
}

export function createVad(options: VadOptions = {}): VadController {
  const threshold = options.threshold ?? 0.055;
  const minVoicedFrames = options.minVoicedFrames ?? 5;
  const warmupMs = options.warmupMs ?? 250;

  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let data: Uint8Array<ArrayBuffer> | null = null;

  let monitoring = false;
  let rafId: number | null = null;
  let voicedFrames = 0;
  let armAt = 0;
  let onSpeech: (() => void) | null = null;

  const rms = (): number => {
    if (!analyser || !data) return 0;
    analyser.getByteTimeDomainData(data);
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128; // center & normalize to [-1, 1]
      sumSq += v * v;
    }
    return Math.sqrt(sumSq / data.length);
  };

  const loop = () => {
    if (!monitoring) return;
    if (performance.now() < armAt) {
      rafId = window.requestAnimationFrame(loop);
      return;
    }
    if (rms() >= threshold) {
      voicedFrames += 1;
      if (voicedFrames >= minVoicedFrames) {
        const cb = onSpeech;
        stopMonitoring();
        cb?.();
        return;
      }
    } else {
      voicedFrames = 0;
    }
    rafId = window.requestAnimationFrame(loop);
  };

  const stopMonitoring = () => {
    monitoring = false;
    onSpeech = null;
    voicedFrames = 0;
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const controller: VadController = {
    get ready() {
      return !!analyser;
    },

    async prime() {
      if (analyser) return true;
      const AC = getAudioContext();
      if (!AC || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        ctx = new AC();
        source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.2;
        data = new Uint8Array(analyser.fftSize);
        source.connect(analyser);
        return true;
      } catch {
        // Insecure context, denied permission, or unsupported — barge-in falls
        // back to the Web Speech interim path.
        controller.dispose();
        return false;
      }
    },

    start(cb: () => void) {
      if (!analyser) return;
      if (ctx?.state === "suspended") void ctx.resume();
      onSpeech = cb;
      voicedFrames = 0;
      armAt = performance.now() + warmupMs;
      if (!monitoring) {
        monitoring = true;
        rafId = window.requestAnimationFrame(loop);
      }
    },

    stop() {
      stopMonitoring();
    },

    dispose() {
      stopMonitoring();
      try {
        source?.disconnect();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
      if (ctx && ctx.state !== "closed") void ctx.close();
      stream = null;
      ctx = null;
      source = null;
      analyser = null;
      data = null;
    },
  };

  return controller;
}
