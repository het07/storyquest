import { GoogleGenAI, Type } from "@google/genai";

import type { SearchResult, SearchSource } from "@/types";

export function isGeminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
