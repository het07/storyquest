import { NextResponse } from "next/server";

import type { Difficulty } from "@/types";
import { buildQuiz, isQuizConfigured } from "@/lib/quiz";
import { resolveIdentity } from "@/lib/identity";
import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";
import {
  ARENA_DEFAULTS,
  MAX_QUESTIONS,
  MAX_TIME_LIMIT,
  MIN_QUESTIONS,
  MIN_TIME_LIMIT,
  makeMatchCode,
} from "@/lib/arena";

export const runtime = "nodejs";
/** Allow Exa retries (up to 4 × 10s) plus Gemini fallback in one request. */
export const maxDuration = 120;

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Creates a duel: generates a quiz, freezes it as a question pack (answer key
 * included, server-only), and opens a shareable match. Requires Mongo + Gemini.
 */
export async function POST(request: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "Arena needs a database. Configure MONGODB_URI to enable duels." },
      { status: 503 }
    );
  }
  if (!isQuizConfigured()) {
    return NextResponse.json(
      { error: "Arena needs EXA_API_KEY or GEMINI_API_KEY to build duel packs." },
      { status: 503 }
    );
  }

  const { ownerId } = await resolveIdentity();
  if (!ownerId) {
    return NextResponse.json({ error: "Could not identify you." }, { status: 401 });
  }

  let topic = "";
  let context = "";
  let difficulty: Difficulty = "intermediate";
  let numQuestions: number = ARENA_DEFAULTS.numQuestions;
  let timeLimitSec: number = ARENA_DEFAULTS.timeLimitSec;
  try {
    const body = await request.json();
    topic = String(body?.topic ?? "").trim();
    context = String(body?.context ?? "").slice(0, 4000);
    if (DIFFICULTIES.includes(body?.difficulty)) difficulty = body.difficulty;
    if (Number.isFinite(body?.numQuestions)) {
      numQuestions = clamp(Math.trunc(Number(body.numQuestions)), MIN_QUESTIONS, MAX_QUESTIONS);
    }
    if (Number.isFinite(body?.timeLimitSec)) {
      timeLimitSec = clamp(Math.trunc(Number(body.timeLimitSec)), MIN_TIME_LIMIT, MAX_TIME_LIMIT);
    }
  } catch {
    // fall through to validation
  }

  if (!topic) {
    return NextResponse.json({ error: "A topic is required." }, { status: 400 });
  }

  try {
    const built = await buildQuiz({ topic, context, difficulty, numQuestions });
    if (!built) {
      return NextResponse.json(
        { error: "Couldn't build a duel pack right now. Please try again." },
        { status: 502 }
      );
    }
    const { quiz } = built;
    const { questionPacks, arenaMatches } = await collections();

    const now = new Date();
    const packResult = await questionPacks.insertOne({
      topic,
      difficulty: quiz.difficulty,
      questions: quiz.questions,
      createdBy: ownerId,
      createdAt: now,
    });
    const packId = packResult.insertedId.toString();

    // Try a few codes to avoid a rare collision.
    let code = makeMatchCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await arenaMatches.findOne({ code });
      if (!existing) break;
      code = makeMatchCode();
    }

    await arenaMatches.insertOne({
      code,
      packId,
      topic,
      difficulty: quiz.difficulty,
      numQuestions: quiz.questions.length,
      timeLimitSec,
      status: "open",
      createdBy: ownerId,
      results: [],
      rated: false,
      createdAt: now,
    });

    return NextResponse.json({
      code,
      topic,
      difficulty: quiz.difficulty,
      numQuestions: quiz.questions.length,
      timeLimitSec,
    });
  } catch (error) {
    console.error("[arena] challenge creation failed:", error);
    return NextResponse.json(
      { error: "Couldn't create a duel right now. Please try again." },
      { status: 502 }
    );
  }
}
