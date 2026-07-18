import { NextResponse } from "next/server";

export const runtime = "nodejs";

// A "premade" voice — usable on the free tier via the API (shared-library
// voices return 402 for free accounts).
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // "George" (premade)
const MAX_TEXT_LENGTH = 5000;

export function isElevenLabsConfigured() {
  return !!process.env.ELEVENLABS_API_KEY;
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  // 501 tells the client to fall back to the browser speech synthesizer.
  if (!apiKey) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 501 });
  }

  let text = "";
  let voiceOverride = "";
  try {
    const body = await request.json();
    text = String(body?.text ?? "").trim();
    if (typeof body?.voiceId === "string") voiceOverride = body.voiceId.trim();
  } catch {
    // fall through to validation
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  const voiceId = voiceOverride || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: { stability: 0.4, similarity_boost: 0.75 },
        }),
      }
    );

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      console.error("[tts] ElevenLabs error:", res.status, detail);
      // Surface the upstream status so the client falls back gracefully.
      return NextResponse.json(
        { error: "TTS failed", upstreamStatus: res.status, detail: detail.slice(0, 500) },
        { status: 502, headers: { "x-tts-upstream-status": String(res.status) } }
      );
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[tts] error:", error);
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}
