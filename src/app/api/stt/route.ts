import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WISPR_REST_ENDPOINT =
  "https://platform-api.wisprflow.ai/api/v1/dash/api";
const PLACEHOLDER = "your_wispr_api_key";

export function isWisprConfigured() {
  const key = process.env.WISPR_API_KEY;
  return !!key && key !== PLACEHOLDER;
}

/**
 * Proxies audio to Wispr Flow's REST transcription API. Keeps the API key on
 * the server. Expects `{ audio }` where `audio` is base64-encoded, 16kHz,
 * 16-bit mono WAV. Returns 501 when unconfigured so the client can fall back
 * to the Web Speech API.
 */
export async function POST(request: Request) {
  const apiKey = process.env.WISPR_API_KEY;
  if (!apiKey || apiKey === PLACEHOLDER) {
    return NextResponse.json({ error: "STT (Wispr) not configured" }, { status: 501 });
  }

  let audio = "";
  let language = "en";
  try {
    const body = await request.json();
    audio = String(body?.audio ?? "");
    if (typeof body?.language === "string") language = body.language;
  } catch {
    // fall through to validation
  }

  if (!audio) {
    return NextResponse.json({ error: "audio is required" }, { status: 400 });
  }

  try {
    const res = await fetch(WISPR_REST_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio,
        properties: { language, app_type: "ai" },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[stt] Wispr error:", res.status, detail);
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      text: typeof data?.text === "string" ? data.text : "",
      provider: "wispr",
      language: data?.detected_language,
    });
  } catch (error) {
    console.error("[stt] error:", error);
    return NextResponse.json({ error: "Transcription error" }, { status: 500 });
  }
}
