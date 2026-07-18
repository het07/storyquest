import Exa from "exa-js";

import type {
  CareerRoadmap,
  DeepDive,
  DeepDiveMisconception,
  DeepDiveSection,
  Difficulty,
  RoadmapLevel,
  RoadmapStage,
  SearchResult,
  SearchSource,
} from "@/types";
import { exaSearchLimiter } from "@/lib/rate-limiter";

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("Exa search rate limit reached");
    this.name = "RateLimitedError";
  }
}

/** Primary + optional fallback key (skips empty / placeholder values). */
function getExaKeys(): string[] {
  const raw = [process.env.EXA_API_KEY, process.env.EXA_API_KEY_FALLBACK];
  const keys = raw
    .map((k) => k?.trim())
    .filter((k): k is string => !!k && !k.startsWith("your_"));
  return [...new Set(keys)];
}

export function isExaConfigured() {
  return getExaKeys().length > 0;
}

function isRetriableKeyError(error: unknown): boolean {
  if (error instanceof RateLimitedError) return false;
  const status = (error as { status?: number; statusCode?: number })?.status
    ?? (error as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403 || status === 402) return true;
  const msg = String((error as Error)?.message ?? error).toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("invalid api key") ||
    msg.includes("invalid key") ||
    msg.includes("forbidden") ||
    msg.includes("authentication") ||
    msg.includes("api key") ||
    msg.includes("credit") ||
    msg.includes("quota") ||
    msg.includes("payment") ||
    msg.includes("billing")
  );
}

/**
 * Runs an Exa call with the primary key, then `EXA_API_KEY_FALLBACK` if the
 * primary fails (auth / quota / billing). In-process rate limiting still applies.
 */
async function withExa<T>(fn: (exa: Exa) => Promise<T>): Promise<T> {
  const keys = getExaKeys();
  if (keys.length === 0) {
    throw new Error("EXA_API_KEY is not set");
  }

  let lastError: unknown;
  for (let i = 0; i < keys.length; i++) {
    try {
      return await fn(new Exa(keys[i]));
    } catch (error) {
      lastError = error;
      if (error instanceof RateLimitedError) throw error;
      const hasNext = i < keys.length - 1;
      if (hasNext && isRetriableKeyError(error)) {
        console.warn(
          `[exa] key ${i + 1} failed (${(error as Error)?.message ?? "error"}); trying fallback key`
        );
        continue;
      }
      // Any other failure with a remaining key — still try fallback once.
      if (hasNext) {
        console.warn(
          `[exa] key ${i + 1} request failed; trying fallback key`
        );
        continue;
      }
      throw error;
    }
  }
  throw lastError;
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

  return withExa(async (exa) => {
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
      source: "exa" as const,
      tldr: structured.tldr?.trim() || deriveTldr(sources),
      keyTakeaways:
        structured.keyTakeaways?.filter(Boolean).length
          ? structured.keyTakeaways!.filter(Boolean)
          : deriveTakeaways(sources),
      relatedConcepts: structured.relatedConcepts?.filter(Boolean) ?? [],
      difficulty: structured.difficulty ?? "intermediate",
      sources,
    };
  });
}

/**
 * Exa object schemas: max nesting depth 2, max 10 total properties.
 * Stage `exploreTopics` is derived from skills (keeps us under the limit).
 */
const ROADMAP_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    pathTitle: {
      type: "string",
      description: "A motivating title for this learning/career path.",
    },
    summary: {
      type: "string",
      description: "2-3 sentences describing the overall progression.",
    },
    possibleRoles: {
      type: "array",
      items: { type: "string" },
      description: "3-5 job roles or mastery outcomes this path can lead to.",
    },
    stages: {
      type: "array",
      description: "4-6 ordered stages from foundations to expertise.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Stage name." },
          level: {
            type: "string",
            enum: ["foundation", "building", "advanced", "expert"],
          },
          description: {
            type: "string",
            description: "What to learn and do in this stage.",
          },
          skills: {
            type: "array",
            items: { type: "string" },
            description: "3-5 concrete skills to build.",
          },
          milestones: {
            type: "array",
            items: { type: "string" },
            description: "2-3 checkpoints that prove progress.",
          },
          estimatedTime: {
            type: "string",
            description: 'Time estimate, e.g. "4-8 weeks".',
          },
        },
        required: ["title", "level", "description"],
      },
    },
  },
  required: ["pathTitle", "summary", "stages", "possibleRoles"],
};

const ROADMAP_SYSTEM_PROMPT =
  "You are a career and learning-path advisor. Using real web sources about " +
  "skills, curricula, and roles, produce a practical progressive roadmap from " +
  "foundations to expertise. Be specific about skills and milestones. If the " +
  "topic is academic rather than a job, frame stages as a mastery path with " +
  "relevant outcomes.";

const ROADMAP_LEVELS: RoadmapLevel[] = [
  "foundation",
  "building",
  "advanced",
  "expert",
];

interface ExaRoadmapOutput {
  pathTitle?: string;
  summary?: string;
  possibleRoles?: string[];
  stages?: {
    title?: string;
    level?: string;
    description?: string;
    skills?: string[];
    milestones?: string[];
    estimatedTime?: string;
  }[];
}

/**
 * Generates a career/learning roadmap with Exa search + structured output.
 * Throws {@link RateLimitedError} when the 10 QPS cap would be exceeded.
 */
export async function generateRoadmapWithExa(args: {
  topic: string;
  context?: string;
}): Promise<CareerRoadmap> {
  const gate = exaSearchLimiter.tryAcquire();
  if (!gate.allowed) throw new RateLimitedError(gate.retryAfterMs);

  const query = [
    `Learning and career roadmap for ${args.topic}`,
    "progressive stages skills milestones time estimates job roles",
    args.context ? `Context: ${args.context.slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return withExa(async (exa) => {
    const response = await exa.searchAndContents(query, {
      type: "auto",
      numResults: 6,
      summary: true,
      systemPrompt: ROADMAP_SYSTEM_PROMPT,
      outputSchema: ROADMAP_OUTPUT_SCHEMA,
    });

    const content = response.output?.content;
    const structured: ExaRoadmapOutput =
      content && typeof content === "object" ? (content as ExaRoadmapOutput) : {};

    const stages: RoadmapStage[] = (structured.stages ?? [])
      .filter((s) => s.title && s.description)
      .slice(0, 6)
      .map((s, i) => {
        const skills = (s.skills ?? []).filter(Boolean);
        const level = ROADMAP_LEVELS.includes(s.level as RoadmapLevel)
          ? (s.level as RoadmapLevel)
          : "building";
        return {
          id: `stage-${i + 1}`,
          title: s.title!,
          level,
          description: s.description!,
          skills,
          milestones: (s.milestones ?? []).filter(Boolean),
          estimatedTime: s.estimatedTime?.trim() || "Flexible",
          // Keep under Exa's 10-property schema limit by deriving explore topics.
          exploreTopics: skills.slice(0, 3),
        };
      });

    if (stages.length < 3) {
      throw new Error("Exa returned an incomplete roadmap.");
    }

    return {
      topic: args.topic,
      pathTitle: structured.pathTitle?.trim() || `Path through ${args.topic}`,
      summary: structured.summary?.trim() || "",
      stages,
      possibleRoles: (structured.possibleRoles ?? []).filter(Boolean).slice(0, 6),
      source: "exa" as const,
    };
  });
}

/**
 * Fits Exa's max 10 properties / depth 2. Nested section + misconception fields
 * share the budget with top-level keys.
 */
const DEEP_DIVE_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    overview: {
      type: "string",
      description: "A richer 4-6 sentence overview beyond a TL;DR.",
    },
    sections: {
      type: "array",
      description: "3-5 titled deep-dive sections.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "1-2 paragraphs of explanation." },
          keyPoints: {
            type: "array",
            items: { type: "string" },
            description: "2-4 bullet takeaways for this section.",
          },
        },
        required: ["title", "content"],
      },
    },
    examples: {
      type: "array",
      items: { type: "string" },
      description: "2-4 concrete real-world examples.",
    },
    misconceptions: {
      type: "array",
      description: "2-3 common myths and the reality.",
      items: {
        type: "object",
        properties: {
          myth: { type: "string" },
          reality: { type: "string" },
        },
        required: ["myth", "reality"],
      },
    },
    furtherQuestions: {
      type: "array",
      items: { type: "string" },
      description: "3-5 follow-up questions worth exploring next.",
    },
  },
  required: [
    "overview",
    "sections",
    "examples",
    "misconceptions",
    "furtherQuestions",
  ],
};

const DEEP_DIVE_SYSTEM_PROMPT =
  "You are an expert tutor writing an in-depth study guide from web sources. " +
  "Go beyond a surface summary: explain mechanisms, use concrete examples, " +
  "correct common misconceptions, and suggest what to explore next. Be accurate and clear.";

interface ExaDeepDiveOutput {
  overview?: string;
  sections?: {
    title?: string;
    content?: string;
    keyPoints?: string[];
  }[];
  examples?: string[];
  misconceptions?: { myth?: string; reality?: string }[];
  furtherQuestions?: string[];
}

/**
 * Generates an in-depth study guide with Exa search + structured output.
 * Throws {@link RateLimitedError} when the 10 QPS cap would be exceeded.
 */
export async function generateDeepDiveWithExa(args: {
  topic: string;
  context?: string;
  difficulty?: Difficulty;
}): Promise<DeepDive> {
  const gate = exaSearchLimiter.tryAcquire();
  if (!gate.allowed) throw new RateLimitedError(gate.retryAfterMs);

  const difficulty = args.difficulty ?? "intermediate";
  const query = [
    `In-depth explanation of ${args.topic}`,
    `at ${difficulty} level`,
    "mechanisms examples misconceptions further questions study guide",
    args.context ? `Learner already knows: ${args.context.slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return withExa(async (exa) => {
    const response = await exa.searchAndContents(query, {
      type: "auto",
      numResults: 6,
      summary: true,
      systemPrompt: DEEP_DIVE_SYSTEM_PROMPT,
      outputSchema: DEEP_DIVE_OUTPUT_SCHEMA,
    });

    const content = response.output?.content;
    const structured: ExaDeepDiveOutput =
      content && typeof content === "object" ? (content as ExaDeepDiveOutput) : {};

    const sections: DeepDiveSection[] = (structured.sections ?? [])
      .filter((s) => s.title && s.content)
      .slice(0, 5)
      .map((s) => ({
        title: s.title!,
        content: s.content!,
        keyPoints: (s.keyPoints ?? []).filter(Boolean),
      }));

    const misconceptions: DeepDiveMisconception[] = (structured.misconceptions ?? [])
      .filter((m) => m.myth && m.reality)
      .map((m) => ({ myth: m.myth!, reality: m.reality! }));

    if (!structured.overview?.trim() || sections.length === 0) {
      throw new Error("Exa returned an incomplete deep-dive guide.");
    }

    return {
      topic: args.topic,
      overview: structured.overview.trim(),
      sections,
      examples: (structured.examples ?? []).filter(Boolean).slice(0, 4),
      misconceptions,
      furtherQuestions: (structured.furtherQuestions ?? [])
        .filter(Boolean)
        .slice(0, 5),
      source: "exa" as const,
    };
  });
}
