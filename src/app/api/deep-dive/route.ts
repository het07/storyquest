import { NextResponse } from "next/server";

import type { DeepDive, Difficulty } from "@/types";
import {
  generateDeepDiveWithExa,
  isExaConfigured,
  RateLimitedError,
} from "@/lib/exa";
import { generateDeepDive, isGeminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

export async function POST(request: Request) {
  let topic = "";
  let context = "";
  let difficulty: Difficulty = "intermediate";
  try {
    const body = await request.json();
    topic = String(body?.topic ?? "").trim();
    context = String(body?.context ?? "").slice(0, 4000);
    if (DIFFICULTIES.includes(body?.difficulty)) difficulty = body.difficulty;
  } catch {
    // fall through
  }

  if (!topic) {
    return NextResponse.json({ error: "A topic is required." }, { status: 400 });
  }

  let guide: DeepDive | null = null;
  let usedFallback = false;

  // 1) Primary: Exa (web-grounded) — avoids Gemini free-tier quota issues.
  if (isExaConfigured()) {
    try {
      guide = await generateDeepDiveWithExa({ topic, context, difficulty });
    } catch (error) {
      usedFallback = true;
      if (!(error instanceof RateLimitedError)) {
        console.error("[deep-dive] Exa error:", error);
      }
    }
  } else {
    usedFallback = true;
  }

  // 2) Fallback: Gemini.
  if (!guide && isGeminiConfigured()) {
    try {
      guide = await generateDeepDive({ topic, context, difficulty });
    } catch (error) {
      console.error("[deep-dive] Gemini fallback error:", error);
    }
  }

  if (!guide) {
    return NextResponse.json(
      {
        error:
          "Couldn't build a deeper guide. Please try again in a moment.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(guide, {
    headers: usedFallback ? { "x-deep-dive-fallback": "1" } : undefined,
  });
}
