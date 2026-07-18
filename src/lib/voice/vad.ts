/**
 * Energy-based Voice Activity Detector used for barge-in.
 *
 * While the assistant is speaking (TTS), the Web Speech recognizer mostly hears
 * our own audio coming back through the speakers, so relying on it to notice the
 * user talking is slow and unreliable. Instead we briefly open a microphone
 * stream with echo cancellation enabled and watch its energy level: the browser
 * subtracts the speaker output, so what's left is (mostly) the user's real
 * voice. When sustained energy crosses a threshold we fire `onSpeech` so the
 * caller can cut the TTS immediately.
 *
 * IMPORTANT: the mic is only held while `start()`..`stop()` is active (i.e. only
 * during TTS playback). During normal listening the stream is released so it
 * never competes with the Web Speech recognizer for the microphone — holding a
 * second persistent capture open can starve the recognizer and make it stop
 * hearing entirely.
 */

export interface VadController {
  /** Pre-request mic permission (from a user gesture) so barge-in is instant. */
  prime: () => Promise<boolean>;
  /** Start one-shot monitoring; `onSpeech` fires once when the user speaks. */
  start: (onSpeech: () => void) => void;
  /** Stop monitoring and release the microphone. */
  stop: () => void;
  /** Tear everything down. */
  dispose: () => void;
  /** Whether mic permission has been granted at least once. */
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

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export function createVad(options: VadOptions = {}): VadController {
  // Tuned to react to someone talking near the device while ignoring ambient
  // room noise / distant background chatter.
  const threshold = options.threshold ?? 0.08;
  const minVoicedFrames = options.minVoicedFrames ?? 6;
  const warmupMs = options.warmupMs ?? 250;

  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let data: Uint8Array<ArrayBuffer> | null = null;
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;

  let monitoring = false;
  let rafId: number | null = null;
  let voicedFrames = 0;
  let armAt = 0;
  let granted = false;
  let onSpeech: (() => void) | null = null;

  const ensureContext = (): boolean => {
    if (analyser) return true;
    const AC = getAudioContext();
    if (!AC) return false;
    ctx = new AC();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;
    data = new Uint8Array(analyser.fftSize);
    return true;
  };

  const releaseMic = () => {
    try {
      source?.disconnect();
    } catch {
      /* ignore */
    }
    source = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  const acquire = async (): Promise<boolean> => {
    if (source) return true;
    if (!ensureContext()) return false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      source = ctx!.createMediaStreamSource(stream);
      source.connect(analyser!);
      granted = true;
      return true;
    } catch {
      releaseMic();
      return false;
    }
  };

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
        releaseMic();
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
      return granted;
    },

    async prime() {
      const ok = await acquire();
      // Release immediately — we only hold the mic while actually speaking.
      releaseMic();
      return ok;
    },

    start(cb: () => void) {
      onSpeech = cb;
      voicedFrames = 0;
      armAt = performance.now() + warmupMs;
      if (monitoring) return;
      monitoring = true;
      void acquire().then((ok) => {
        if (!ok || !monitoring) {
          monitoring = false;
          return;
        }
        if (ctx?.state === "suspended") void ctx.resume();
        rafId = window.requestAnimationFrame(loop);
      });
    },

    stop() {
      stopMonitoring();
      releaseMic();
    },

    dispose() {
      stopMonitoring();
      releaseMic();
      if (ctx && ctx.state !== "closed") void ctx.close();
      ctx = null;
      analyser = null;
      data = null;
    },
  };

  return controller;
}
