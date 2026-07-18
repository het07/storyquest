export type Difficulty = "beginner" | "intermediate" | "advanced";

export type SearchProvider = "exa" | "gemini";

export interface SearchSource {
  title: string;
  url: string;
  summary: string;
  highlights: string[];
  favicon?: string;
  readingTimeMins?: number;
  /** Marks AI-suggested (not directly retrieved) sources, e.g. Gemini fallback. */
  suggested?: boolean;
}

export interface SearchResult {
  query: string;
  source: SearchProvider;
  tldr: string;
  keyTakeaways: string[];
  relatedConcepts: string[];
  difficulty: Difficulty;
  sources: SearchSource[];
}
