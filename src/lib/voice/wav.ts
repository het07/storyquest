/**
 * Browser audio helpers for turning captured PCM into the format Wispr Flow
 * expects: base64-encoded, 16kHz, 16-bit, mono WAV.
 */

/** Naive averaging downsampler from `inRate` to `outRate` (default 16kHz). */
export function downsample(
  input: Float32Array,
  inRate: number,
  outRate = 16000
): Float32Array {
  if (outRate >= inRate) return input;
  const ratio = inRate / outRate;
  const outLength = Math.round(input.length / ratio);
  const output = new Float32Array(outLength);

  let outIndex = 0;
  let inIndex = 0;
  while (outIndex < outLength) {
    const nextIn = Math.round((outIndex + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = inIndex; i < nextIn && i < input.length; i++) {
      sum += input[i];
      count++;
    }
    output[outIndex] = count > 0 ? sum / count : 0;
    outIndex++;
    inIndex = nextIn;
  }
  return output;
}

/** Encodes mono Float32 samples as a 16-bit PCM WAV container. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

/** ArrayBuffer → base64 (chunked to avoid call-stack limits). */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Decodes a recorded audio Blob into base64 16kHz mono WAV for Wispr. */
export async function blobToWavBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const mono = decoded.getChannelData(0);
    const downsampled = downsample(mono, decoded.sampleRate, 16000);
    const wav = encodeWav(downsampled, 16000);
    return arrayBufferToBase64(wav);
  } finally {
    void ctx.close();
  }
}
