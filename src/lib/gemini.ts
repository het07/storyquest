import { GoogleGenAI, Type } from "@google/genai";

import type {
  DeepDive,
  Difficulty,
  Quiz,
  QuizQuestion,
  SearchResult,
  SearchSource,
} from "@/types";

export function isGeminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

let client: GoogleGenAI | null = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return client;
}

/** Generic helper: prompt Gemini and parse a JSON response against a schema. */
export async function generateJson<T>(args: {
  prompt: string;
  systemInstruction?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema: any;
}): Promise<T> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: args.prompt,
    config: {
      systemInstruction: args.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: args.responseSchema,
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text) as T;
}

interface GeminiSearchShape {
  tldr: string;
  keyTakeaways: string[];
  relatedConcepts: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  notes: { title: string; summary: string; highlights?: string[] }[];
}

const SEARCH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tldr: { type: Type.STRING },
    keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
    relatedConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    difficulty: {
      type: Type.STRING,
      enum: ["beginner", "intermediate", "advanced"],
    },
    notes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "summary"],
      },
    },
  },
  required: ["tldr", "keyTakeaways", "relatedConcepts", "difficulty", "notes"],
};

/**
 * Free-tier fallback used when Exa is unavailable or rate limited. Produces the
 * same structured, visualizable shape as the Exa path. Because it isn't a live
 * web crawl, "sources" are AI study notes (marked `suggested`) that link to a
 * web search rather than to fabricated URLs.
 */
export async function fallbackSearch(query: string): Promise<SearchResult> {
  const data = await generateJson<GeminiSearchShape>({
    systemInstruction:
      "You are a friendly tutor helping a curious learner understand a topic in " +
      "clear, plain language. Be accurate and avoid jargon.",
    prompt:
      `Explain the topic: "${query}".\n` +
      "Return: a plain-language TL;DR (2-3 sentences), 4-6 key takeaways, " +
      "4-6 related concepts to explore next, an overall difficulty, and 4 short " +
      "study-note sections (each with a title, a 2-3 sentence summary, and 1-2 highlights).",
    responseSchema: SEARCH_SCHEMA,
  });

  const sources: SearchSource[] = (data.notes ?? []).map((n) => ({
    title: n.title,
    url: `https://www.google.com/search?q=${encodeURIComponent(
      `${query} ${n.title}`
    )}`,
    summary: n.summary,
    highlights: n.highlights ?? [],
    suggested: true,
    readingTimeMins: 1,
  }));

  return {
    query,
    source: "gemini",
    tldr: data.tldr,
    keyTakeaways: data.keyTakeaways ?? [],
    relatedConcepts: data.relatedConcepts ?? [],
    difficulty: data.difficulty ?? "intermediate",
    sources,
  };
}

interface GeminiQuizShape {
  questions: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

const QUIZ_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ["question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["questions"],
};

/**
 * Generates a multiple-choice quiz for a topic, grounded in the summary the
 * learner just read so questions stay on-topic.
 */
export async function generateQuiz(args: {
  topic: string;
  context?: string;
  difficulty?: Difficulty;
  numQuestions?: number;
}): Promise<Quiz> {
  const difficulty = args.difficulty ?? "intermediate";
  const count = Math.min(Math.max(args.numQuestions ?? 5, 3), 10);

  const data = await generateJson<GeminiQuizShape>({
    systemInstruction:
      "You are an expert quiz writer for a learning app. Write clear, " +
      "unambiguous multiple-choice questions that test genuine understanding, " +
      "not trivia. Each question must have exactly 4 options with exactly one " +
      "correct answer, plausible distractors, and a concise explanation of why " +
      "the correct answer is right.",
    prompt:
      `Create a ${count}-question multiple-choice quiz about "${args.topic}" ` +
      `at a ${difficulty} level.` +
      (args.context ? `\n\nUse this material as grounding:\n${args.context}` : "") +
      "\n\nEach question needs exactly 4 options, a correctIndex (0-3), and a short explanation.",
    responseSchema: QUIZ_SCHEMA,
  });

  const questions: QuizQuestion[] = (data.questions ?? [])
    // Keep only well-formed 4-option questions with a valid answer index.
    .filter(
      (q) =>
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3
    )
    .map((q, i) => ({
      id: `q${i + 1}`,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? "",
    }));

  if (questions.length === 0) {
    throw new Error("Could not generate quiz questions for this topic.");
  }

  return { topic: args.topic, difficulty, questions };
}

interface GeminiDeepDiveShape {
  overview: string;
  sections: { title: string; content: string; keyPoints?: string[] }[];
  examples: string[];
  misconceptions: { myth: string; reality: string }[];
  furtherQuestions: string[];
}

const DEEP_DIVE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "content"],
      },
    },
    examples: { type: Type.ARRAY, items: { type: Type.STRING } },
    misconceptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          myth: { type: Type.STRING },
          reality: { type: Type.STRING },
        },
        required: ["myth", "reality"],
      },
    },
    furtherQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "overview",
    "sections",
    "examples",
    "misconceptions",
    "furtherQuestions",
  ],
};

/**
 * Builds a structured in-depth study guide for learners who want more than
 * the TL;DR — sections, examples, common misconceptions, and next questions.
 */
export async function generateDeepDive(args: {
  topic: string;
  context?: string;
  difficulty?: Difficulty;
}): Promise<DeepDive> {
  const difficulty = args.difficulty ?? "intermediate";

  const data = await generateJson<GeminiDeepDiveShape>({
    systemInstruction:
      "You are a patient, expert tutor writing an in-depth study guide. " +
      "Go beyond a surface summary: explain mechanisms, use concrete examples, " +
      "correct common misconceptions, and suggest what to explore next. " +
      "Be accurate, clear, and engaging — no fluff.",
    prompt:
      `Write an in-depth study guide about "${args.topic}" at a ${difficulty} level.\n` +
      "Return: a richer overview (4-6 sentences), 3-5 titled sections (each with a " +
      "paragraph and 2-4 key points), 2-4 concrete examples, 2-3 common misconceptions " +
      "(myth + reality), and 3-5 further questions worth exploring next." +
      (args.context
        ? `\n\nGround the guide in this material the learner already saw:\n${args.context}`
        : ""),
    responseSchema: DEEP_DIVE_SCHEMA,
  });

  const sections = (data.sections ?? [])
    .filter((s) => s.title && s.content)
    .map((s) => ({
      title: s.title,
      content: s.content,
      keyPoints: s.keyPoints ?? [],
    }));

  if (!data.overview || sections.length === 0) {
    throw new Error("Could not generate a deep-dive guide for this topic.");
  }

  return {
    topic: args.topic,
    overview: data.overview,
    sections,
    examples: data.examples ?? [],
    misconceptions: (data.misconceptions ?? []).filter((m) => m.myth && m.reality),
    furtherQuestions: data.furtherQuestions ?? [],
  };
}
