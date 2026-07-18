import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import type { Difficulty } from "@/types";
import { auth } from "@/auth";
import { resolveIdentity } from "@/lib/identity";
import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";
import { applyResultRatings } from "@/lib/arena-db";
import { computePoints, gradeAnswers, rankResults } from "@/lib/arena";
import type { ArenaResult, QuestionPackDoc } from "@/types/db";

export const runtime = "nodejs";

/** Arena XP for the personal dashboard (mirrors the solo quiz formula). */
function computeXp(score: number, total: number, difficulty: Difficulty): number {
  const multiplier =
    difficulty === "advanced" ? 3 : difficulty === "intermediate" ? 2 : 1;
  const base = score * 10 * multiplier;
  const perfect = total > 0 && score === total ? 25 : 0;
  return base + perfect;
}

function normalizeAnswers(input: unknown, count: number): number[] {
  const arr = Array.isArray(input) ? input : [];
  const answers: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.trunc(Number(arr[i]));
    answers.push(Number.isFinite(v) && v >= 0 && v <= 3 ? v : -1);
  }
  return answers;
}

function summarize(results: ArenaResult[], ownerId: string) {
  return rankResults(results).map((r, i) => ({
    ownerId: r.ownerId,
    name: r.name,
    image: r.image,
    isGuest: r.isGuest,
    score: r.score,
    total: r.total,
    timeMs: r.timeMs,
    points: r.points,
    rank: i + 1,
    mine: r.ownerId === ownerId,
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "Arena is unavailable." }, { status: 503 });
  }

  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const [{ ownerId }, session] = await Promise.all([resolveIdentity(), auth()]);
  if (!ownerId) {
    return NextResponse.json({ error: "Could not identify you." }, { status: 401 });
  }
  const isGuest = !session?.user?.id;
  const name = session?.user?.name || "Guest";
  const image = session?.user?.image || undefined;

  const { arenaMatches, questionPacks, quizAttempts } = await collections();
  const match = await arenaMatches.findOne({ code });
  if (!match) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }

  const pack = await questionPacks.findOne({ _id: new ObjectId(match.packId) });
  if (!pack) {
    return NextResponse.json({ error: "Challenge pack missing." }, { status: 500 });
  }
  const questions = (pack as QuestionPackDoc).questions;

  // Idempotent: if this player already submitted, just return their result.
  const existing = match.results.find((r) => r.ownerId === ownerId);
  if (existing) {
    const ranked = summarize(match.results, ownerId);
    return NextResponse.json({
      saved: true,
      alreadyPlayed: true,
      reveal: questions,
      myAnswers: existing.answers,
      rated: match.rated,
      results: ranked,
    });
  }

  let timeMs = 0;
  let rawAnswers: unknown = [];
  try {
    const body = await request.json();
    rawAnswers = body?.answers;
    timeMs = Math.max(0, Math.trunc(Number(body?.timeMs) || 0));
  } catch {
    // fall through
  }

  const answers = normalizeAnswers(rawAnswers, questions.length);
  const score = gradeAnswers(questions, answers);
  const total = questions.length;
  // Guard against impossibly fast/slow times; cap penalty window at the limit.
  const cappedTime = Math.min(timeMs, (match.timeLimitSec + 30) * 1000);
  const points = computePoints({
    score,
    total,
    timeMs: cappedTime,
    timeLimitSec: match.timeLimitSec,
  });

  const result: ArenaResult = {
    ownerId,
    name,
    image,
    isGuest,
    answers,
    score,
    total,
    timeMs: cappedTime,
    points,
    submittedAt: new Date(),
  };

  // Add this player once (any number of players can join a challenge).
  await arenaMatches.updateOne(
    { code, "results.ownerId": { $ne: ownerId } },
    { $push: { results: result } }
  );

  const updated = await arenaMatches.findOne({ code });
  const allResults = updated?.results ?? [result];

  // Rate the joiner against every signed-in opponent already present.
  let ratingDelta: number | undefined;
  if (updated) {
    const me = updated.results.find((r) => r.ownerId === ownerId) ?? result;
    try {
      ratingDelta = await applyResultRatings(updated, me);
    } catch (error) {
      console.error("[arena] rating update failed:", error);
    }
  }
  const rated = ratingDelta !== undefined;
  if (rated && !match.rated) {
    await arenaMatches.updateOne({ code }, { $set: { rated: true } });
  }

  const ranked = summarize(allResults, ownerId);
  const mine = ranked.find((r) => r.mine);
  const rank = mine?.rank ?? ranked.length;
  const players = ranked.length;

  // Feed the personal dashboard (XP + streak) from Arena play too.
  try {
    const opponent = allResults.find((r) => r.ownerId !== ownerId);
    await quizAttempts.insertOne({
      ownerId,
      topic: match.topic,
      difficulty: match.difficulty,
      score,
      total,
      xp: computeXp(score, total, match.difficulty),
      createdAt: new Date(),
      arenaMatchId: code,
      opponentId: opponent?.ownerId,
      ratingDelta,
    });
  } catch (error) {
    console.error("[arena] attempt persistence skipped:", error);
  }

  return NextResponse.json({
    saved: true,
    reveal: questions,
    myAnswers: answers,
    result: { score, total, points, timeMs: cappedTime, rank, players },
    rated,
    ratingDelta,
    results: ranked,
  });
}
