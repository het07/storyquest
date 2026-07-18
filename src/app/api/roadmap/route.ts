import { NextResponse } from "next/server";

import type { CareerRoadmap } from "@/types";
import {
  generateRoadmapWithExa,
  isExaConfigured,
  RateLimitedError,
} from "@/lib/exa";
import { generateCareerRoadmap, isGeminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let topic = "";
  let context = "";
  try {
    const body = await request.json();
    topic = String(body?.topic ?? "").trim();
    context = String(body?.context ?? "").slice(0, 4000);
  } catch {
    // fall through
  }

  if (!topic) {
    return NextResponse.json({ error: "A topic is required." }, { status: 400 });
  }

  let roadmap: CareerRoadmap | null = null;
  let usedFallback = false;

  // 1) Primary: Exa (web-grounded synthesis, rate-limited to the 10 QPS cap).
  if (isExaConfigured()) {
    try {
      roadmap = await generateRoadmapWithExa({ topic, context });
    } catch (error) {
      usedFallback = true;
      if (!(error instanceof RateLimitedError)) {
        console.error("[roadmap] Exa error:", error);
      }
    }
  } else {
    usedFallback = true;
  }

  // 2) Fallback: Gemini.
  if (!roadmap && isGeminiConfigured()) {
    try {
      roadmap = await generateCareerRoadmap({ topic, context });
    } catch (error) {
      console.error("[roadmap] Gemini fallback error:", error);
    }
  }

  if (!roadmap) {
    return NextResponse.json(
      {
        error:
          "Couldn't build a roadmap. Please try again in a moment.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(roadmap, {
    headers: usedFallback ? { "x-roadmap-fallback": "1" } : undefined,
  });
}
