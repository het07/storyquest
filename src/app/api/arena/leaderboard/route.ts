import { NextResponse } from "next/server";

import { getLeaderboard, getRatedTopics } from "@/lib/arena-db";
import { topicScope } from "@/lib/arena";

export const runtime = "nodejs";

/**
 * Reads a leaderboard. `?scope=global` (default) or `?scope=topic&topic=...`.
 * `?topics=1` returns the list of topics that have a rated ladder.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("topics")) {
    return NextResponse.json({ topics: await getRatedTopics() });
  }

  const scope = searchParams.get("scope") === "topic" ? "topic" : "global";

  if (scope === "topic") {
    const topic = (searchParams.get("topic") ?? "").trim();
    if (!topic) {
      return NextResponse.json({ error: "A topic is required." }, { status: 400 });
    }
    const entries = await getLeaderboard(topicScope(topic));
    return NextResponse.json({ scope: "topic", topic, entries });
  }

  const entries = await getLeaderboard("global");
  return NextResponse.json({ scope: "global", entries });
}
