import { NextResponse } from "next/server";

import type { Difficulty } from "@/types";
import { resolveIdentity } from "@/lib/identity";
import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";

export const runtime = "nodejs";

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

/** XP: base per correct answer, bonus for harder quizzes and perfect scores. */
function computeXp(score: number, total: number, difficulty: Difficulty): number {
  const multiplier =
    difficulty === "advanced" ? 3 : difficulty === "intermediate" ? 2 : 1;
  const base = score * 10 * multiplier;
  const perfect = total > 0 && score === total ? 25 : 0;
  return base + perfect;
}

export async function POST(request: Request) {
  let topic = "";
  let difficulty: Difficulty = "intermediate";
  let score = 0;
  let total = 0;
  try {
    const body = await request.json();
    topic = String(body?.topic ?? "").trim();
    if (DIFFICULTIES.includes(body?.difficulty)) difficulty = body.difficulty;
    score = Math.max(0, Math.trunc(Number(body?.score) || 0));
    total = Math.max(0, Math.trunc(Number(body?.total) || 0));
  } catch {
    // fall through
  }

  if (!topic || total === 0) {
    return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  }
  if (score > total) score = total;

  const xp = computeXp(score, total, difficulty);

  // Persistence is best-effort; the quiz result UI works without a DB.
  if (isMongoConfigured()) {
    try {
      const { ownerId } = await resolveIdentity();
      if (ownerId) {
        const { quizAttempts } = await collections();
        await quizAttempts.insertOne({
          ownerId,
          topic,
          difficulty,
          score,
          total,
          xp,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error("[quiz] attempt persistence skipped:", error);
    }
  }

  return NextResponse.json({ saved: true, xp });
}
