import { NextResponse } from "next/server";

import type { Difficulty, Quiz } from "@/types";
import {
  generateQuizWithExa,
  isExaConfigured,
  RateLimitedError,
} from "@/lib/exa";
import { generateQuiz, isGeminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";
/** Allow Exa retries (up to 4 × 10s) plus Gemini fallback in one request. */
export const maxDuration = 120;

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];
const EXA_ATTEMPTS = 4;
const EXA_RETRY_MS = 10_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  if (!isExaConfigured() && !isGeminiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Quizzes need EXA_API_KEY or GEMINI_API_KEY. Add one to enable this feature.",
      },
      { status: 503 }
    );
  }

  let topic = "";
  let context = "";
  let difficulty: Difficulty = "intermediate";
  let numQuestions = 5;
  try {
    const body = await request.json();
    topic = String(body?.topic ?? "").trim();
    context = String(body?.context ?? "").slice(0, 4000);
    if (DIFFICULTIES.includes(body?.difficulty)) difficulty = body.difficulty;
    if (Number.isFinite(body?.numQuestions)) {
      numQuestions = Number(body.numQuestions);
    }
  } catch {
    // fall through to validation
  }

  if (!topic) {
    return NextResponse.json({ error: "A topic is required." }, { status: 400 });
  }

  let quiz: Quiz | null = null;
  let usedFallback = false;

  // 1) Primary: Exa — retry up to 4 times, 10s apart, before falling back.
  if (isExaConfigured()) {
    for (let attempt = 1; attempt <= EXA_ATTEMPTS; attempt++) {
      try {
        quiz = await generateQuizWithExa({
          topic,
          context,
          difficulty,
          numQuestions,
        });
        break;
      } catch (error) {
        const rateLimited = error instanceof RateLimitedError;
        if (!rateLimited) {
          console.error(`[quiz] Exa attempt ${attempt}/${EXA_ATTEMPTS}:`, error);
        } else {
          console.warn(
            `[quiz] Exa rate limited on attempt ${attempt}/${EXA_ATTEMPTS}`
          );
        }
        if (attempt < EXA_ATTEMPTS) {
          const waitMs =
            rateLimited && error.retryAfterMs > 0
              ? Math.max(error.retryAfterMs, EXA_RETRY_MS)
              : EXA_RETRY_MS;
          await sleep(waitMs);
        }
      }
    }
  }

  // 2) Fallback: Gemini after Exa is exhausted or unavailable.
  if (!quiz && isGeminiConfigured()) {
    usedFallback = true;
    try {
      quiz = await generateQuiz({ topic, context, difficulty, numQuestions });
    } catch (error) {
      console.error("[quiz] Gemini fallback error:", error);
    }
  }

  if (!quiz) {
    return NextResponse.json(
      {
        error: "Couldn't build a quiz right now. Please try again.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json(quiz, {
    headers: usedFallback ? { "x-quiz-fallback": "1" } : undefined,
  });
}
