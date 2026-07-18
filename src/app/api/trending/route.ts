import { NextResponse } from "next/server";

import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";
import { CURATED_TOPICS } from "@/lib/topics-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 12, 50);

  if (isMongoConfigured()) {
    try {
      const { topics } = await collections();
      const docs = await topics
        .find(category ? { category } : {}, { projection: { _id: 0 } })
        .sort({ searchCount: -1, name: 1 })
        .limit(limit)
        .toArray();
      if (docs.length > 0) {
        return NextResponse.json({ source: "db", topics: docs });
      }
    } catch (error) {
      console.error("[trending] DB unavailable, using curated fallback:", error);
    }
  }

  let list = CURATED_TOPICS;
  if (category) list = list.filter((t) => t.category === category);

  return NextResponse.json({
    source: "curated",
    topics: list.slice(0, limit).map((t) => ({ ...t, searchCount: 0 })),
  });
}
