import { NextResponse } from "next/server";

import type { Difficulty } from "@/types";
import { generateQuiz, isGeminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Quizzes need GEMINI_API_KEY. Add it to enable this feature." },
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
    if (Number.isFinite(body?.numQuestions)) numQuestions = Number(body.numQuestions);
  } catch {
    // fall through to validation
  }

  if (!topic) {
    return NextResponse.json({ error: "A topic is required." }, { status: 400 });
  }

  try {
    const quiz = await generateQuiz({ topic, context, difficulty, numQuestions });
    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[quiz] generation error:", error);
    return NextResponse.json(
      {
        error: "Couldn't build a quiz right now. Please try again.",
        detail: (error as Error)?.message?.slice(0, 300),
      },
      { status: 502 }
    );
  }
}
