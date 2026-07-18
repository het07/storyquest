import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { resolveIdentity } from "@/lib/identity";
import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";
import { rankResults, toPlayableQuestions } from "@/lib/arena";
import type { ArenaResult, QuestionPackDoc } from "@/types/db";

export const runtime = "nodejs";

function summarizeResults(results: ArenaResult[], ownerId: string | null) {
  const ranked = rankResults(results);
  return ranked.map((r, i) => ({
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "Arena is unavailable." }, { status: 503 });
  }

  const { code } = await params;
  const { arenaMatches, questionPacks } = await collections();
  const match = await arenaMatches.findOne({ code: code.toUpperCase() });
  if (!match) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }

  const { ownerId, isGuest } = await resolveIdentity();
  const hasPlayed = !!ownerId && match.results.some((r) => r.ownerId === ownerId);
  // Any number of players can join, so the only gate is "haven't played yet".
  const canPlay = !hasPlayed;

  const pack = await questionPacks.findOne({ _id: new ObjectId(match.packId) });
  if (!pack) {
    return NextResponse.json({ error: "Challenge pack missing." }, { status: 500 });
  }

  const base = {
    code: match.code,
    topic: match.topic,
    difficulty: match.difficulty,
    numQuestions: match.numQuestions,
    timeLimitSec: match.timeLimitSec,
    status: match.status,
    rated: match.rated,
    isGuest,
    hasPlayed,
    canPlay,
    results: summarizeResults(match.results, ownerId),
  };

  // Only reveal the answer key to players who have already submitted.
  if (hasPlayed) {
    const mine = match.results.find((r) => r.ownerId === ownerId);
    return NextResponse.json({
      ...base,
      reveal: (pack as QuestionPackDoc).questions,
      myAnswers: mine?.answers ?? [],
    });
  }

  return NextResponse.json({
    ...base,
    questions: toPlayableQuestions((pack as QuestionPackDoc).questions),
  });
}
