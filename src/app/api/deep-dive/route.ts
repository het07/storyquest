import { NextResponse } from "next/server";

import type { Difficulty } from "@/types";
import { generateDeepDive, isGeminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "In-depth study needs GEMINI_API_KEY." },
      { status: 503 }
    );
  }

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

  try {
    const guide = await generateDeepDive({ topic, context, difficulty });
    return NextResponse.json(guide);
  } catch (error) {
    console.error("[deep-dive] error:", error);
    return NextResponse.json(
      {
        error: "Couldn't build a deeper guide right now. Please try again.",
        detail: (error as Error)?.message?.slice(0, 300),
      },
      { status: 502 }
    );
  }
}
