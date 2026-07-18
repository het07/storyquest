import Exa from "exa-js";

import type { Difficulty, SearchResult, SearchSource } from "@/types";
import { exaSearchLimiter } from "@/lib/rate-limiter";

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("Exa search rate limit reached");
    this.name = "RateLimitedError";
  }
}

export function isExaConfigured() {
  return !!process.env.EXA_API_KEY;
}

let client: Exa | null = null;
function getClient() {
  if (!client) client = new Exa(process.env.EXA_API_KEY!);
  return client;
}

/**
 * Structured learning synthesis requested alongside the raw search results.
 * Exa returns this in `response.output.content` when `outputSchema` is set.
 * (Object schemas are limited to depth 2 / 10 total properties.)
 */
const LEARNING_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    tldr: {
      type: "string",
      description:
        "A clear 2-3 sentence plain-language summary a curious beginner can understand.",
    },
    keyTakeaways: {
      type: "array",
      items: { type: "string" },
      description: "The 4-6 most important points, each a short sentence.",
    },
    relatedConcepts: {
      type: "array",
      items: { type: "string" },
      description: "4-6 closely related concepts worth exploring next.",
    },
    difficulty: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Overall difficulty of understanding this topic.",
    },
  },
  required: ["tldr", "keyTakeaways", "relatedConcepts", "difficulty"],
};

const SYSTEM_PROMPT =
  "You are helping a curious learner quickly understand a topic. Explain in clear, " +
  "friendly, plain language. Prefer accuracy over jargon.";

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function deriveTldr(sources: SearchSource[]): string {
  const first = sources.find((s) => s.summary)?.summary;
  return first
    ? first.slice(0, 400)
    : "Here's what we found on this topic. Explore the sources below to learn more.";
}

function deriveTakeaways(sources: SearchSource[]): string[] {
  const highlights = sources.flatMap((s) => s.highlights).filter(Boolean);
  const pool = highlights.length
    ? highlights
    : sources.map((s) => s.summary).filter(Boolean);
  return Array.from(new Set(pool)).slice(0, 5);
}

interface StructuredOutput {
  tldr?: string;
  keyTakeaways?: string[];
  relatedConcepts?: string[];
  difficulty?: Difficulty;
}

/**
 * Runs a rate-limited Exa search with content extraction plus a synthesized,
 * learner-friendly structured summary. Throws {@link RateLimitedError} when the
 * 10 QPS team limit would be exceeded so the caller can fall back to Gemini.
 */
export async function searchWithExa(query: string): Promise<SearchResult> {
  const gate = exaSearchLimiter.tryAcquire();
  if (!gate.allowed) throw new RateLimitedError(gate.retryAfterMs);

  const exa = getClient();
  const response = await exa.searchAndContents(query, {
    type: "auto",
    numResults: 8,
    summary: true,
    highlights: { maxCharacters: 240 },
    systemPrompt: SYSTEM_PROMPT,
    outputSchema: LEARNING_OUTPUT_SCHEMA,
  });

  const sources: SearchSource[] = (response.results ?? []).map((r) => {
    const summary = r.summary ?? "";
    const highlights = r.highlights ?? [];
    return {
      title: r.title ?? r.url,
      url: r.url,
      summary,
      highlights,
      favicon: r.favicon,
      readingTimeMins: estimateReadingTime(`${summary} ${highlights.join(" ")}`),
    };
  });

  const content = response.output?.content;
  const structured: StructuredOutput =
    content && typeof content === "object" ? (content as StructuredOutput) : {};

  return {
    query,
    source: "exa",
    tldr: structured.tldr?.trim() || deriveTldr(sources),
    keyTakeaways:
      structured.keyTakeaways?.filter(Boolean).length
        ? structured.keyTakeaways!.filter(Boolean)
        : deriveTakeaways(sources),
    relatedConcepts: structured.relatedConcepts?.filter(Boolean) ?? [],
    difficulty: structured.difficulty ?? "intermediate",
    sources,
  };
}
