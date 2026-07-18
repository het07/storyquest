import { NextResponse } from "next/server";

import type { SearchResult } from "@/types";
import { resolveIdentity } from "@/lib/identity";
import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";
import { isExaConfigured, RateLimitedError, searchWithExa } from "@/lib/exa";
import { fallbackSearch, isGeminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 300;

export async function POST(request: Request) {
  let query = "";
  try {
    const body = await request.json();
    query = String(body?.query ?? "").trim();
  } catch {
    // fall through to validation below
  }

  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.slice(0, MAX_QUERY_LENGTH);
  }

  let result: SearchResult | null = null;
  let usedFallback = false;

  // 1) Primary: Exa (rate-limited to the 10 QPS team cap).
  if (isExaConfigured()) {
    try {
      result = await searchWithExa(query);
    } catch (error) {
      usedFallback = true;
      if (!(error instanceof RateLimitedError)) {
        console.error("[search] Exa error:", error);
      }
    }
  } else {
    usedFallback = true;
  }

  // 2) Fallback: Gemini free tier.
  if (!result && isGeminiConfigured()) {
    try {
      result = await fallbackSearch(query);
    } catch (error) {
      console.error("[search] Gemini fallback error:", error);
    }
  }

  if (!result) {
    return NextResponse.json(
      {
        error:
          "Search is temporarily unavailable. Set EXA_API_KEY (and optionally GEMINI_API_KEY for fallback), or try again in a moment.",
      },
      { status: 503 }
    );
  }

  // Best-effort persistence — never block or fail the response on it.
  void persistSearch(query, result);

  return NextResponse.json(result, {
    headers: usedFallback ? { "x-search-fallback": "1" } : undefined,
  });
}

async function persistSearch(query: string, result: SearchResult) {
  if (!isMongoConfigured()) return;
  try {
    const { ownerId } = await resolveIdentity();
    if (!ownerId) return;

    const { searchQueries, topics } = await collections();

    await searchQueries.insertOne({
      ownerId,
      query,
      source: result.source,
      results: result,
      createdAt: new Date(),
    });

    // Bump trending count when the query matches a curated topic.
    await topics.updateOne(
      { name: { $regex: `^${escapeRegex(query)}$`, $options: "i" } },
      { $inc: { searchCount: 1 } }
    );
  } catch (error) {
    console.error("[search] persistence skipped:", error);
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
