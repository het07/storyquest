import type { Difficulty, Quiz } from "@/types";
import {
  generateQuizWithExa,
  isExaConfigured,
  RateLimitedError,
} from "@/lib/exa";
import { generateQuiz, isGeminiConfigured } from "@/lib/gemini";

/** Allow Exa retries (up to 4 × 10s) plus a Gemini fallback in one request. */
export const EXA_ATTEMPTS = 4;
export const EXA_RETRY_MS = 10_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when at least one quiz provider (Exa or Gemini) is configured. */
export function isQuizConfigured() {
  return isExaConfigured() || isGeminiConfigured();
}

export interface QuizResult {
  quiz: Quiz;
  usedFallback: boolean;
}

/**
 * Builds a quiz using the same strategy as `/api/quiz`: Exa first (with a few
 * retries for its QPS limit), then Gemini as a fallback. Returns `null` if no
 * provider could produce a quiz. Shared so Arena duel packs stay consistent
 * with solo quizzes.
 */
export async function buildQuiz(args: {
  topic: string;
  context?: string;
  difficulty?: Difficulty;
  numQuestions?: number;
}): Promise<QuizResult | null> {
  let quiz: Quiz | null = null;

  // 1) Primary: Exa — retry a few times, 10s apart, before falling back.
  if (isExaConfigured()) {
    for (let attempt = 1; attempt <= EXA_ATTEMPTS; attempt++) {
      try {
        quiz = await generateQuizWithExa(args);
        break;
      } catch (error) {
        const rateLimited = error instanceof RateLimitedError;
        if (!rateLimited) {
          console.error(`[quiz] Exa attempt ${attempt}/${EXA_ATTEMPTS}:`, error);
        } else {
          console.warn(`[quiz] Exa rate limited on attempt ${attempt}/${EXA_ATTEMPTS}`);
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
    try {
      quiz = await generateQuiz(args);
      return { quiz, usedFallback: true };
    } catch (error) {
      console.error("[quiz] Gemini fallback error:", error);
    }
  }

  return quiz ? { quiz, usedFallback: false } : null;
}
