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

export interface QuizQuestion {
  id: string;
  question: string;
  /** Exactly four answer choices. */
  options: string[];
  /** Index (0-3) of the correct option. */
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  topic: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
}

/** A richer study guide generated when the learner wants to go deeper. */
export interface DeepDiveSection {
  title: string;
  content: string;
  keyPoints: string[];
}

export interface DeepDiveMisconception {
  myth: string;
  reality: string;
}

export interface DeepDive {
  topic: string;
  overview: string;
  sections: DeepDiveSection[];
  examples: string[];
  misconceptions: DeepDiveMisconception[];
  /** Follow-up questions the learner can explore next. */
  furtherQuestions: string[];
}
