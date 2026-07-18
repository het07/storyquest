import type { Difficulty, QuizQuestion, SearchProvider, SearchResult } from "@/types";

/** A stored topic search, owned by a user id or a guest id. */
export interface SearchQueryDoc {
  ownerId: string;
  query: string;
  source: SearchProvider;
  results: SearchResult;
  createdAt: Date;
}

/** A curated / trending topic. */
export interface TopicDoc {
  name: string;
  category: string;
  description?: string;
  searchCount: number;
  createdAt: Date;
}

/** A completed quiz attempt, owned by a user id or a guest id. */
export interface QuizAttemptDoc {
  ownerId: string;
  topic: string;
  difficulty: Difficulty;
  score: number;
  total: number;
  /** Experience points awarded for this attempt. */
  xp: number;
  createdAt: Date;
  /** Set when the attempt came from an Arena duel rather than a solo quiz. */
  arenaMatchId?: string;
  /** The opponent's owner id, when this attempt was part of a rated duel. */
  opponentId?: string;
  /** Elo change applied for this duel, if rated. */
  ratingDelta?: number;
}

/**
 * A frozen quiz used for a duel. Storing the full questions (including the
 * answer key) server-side is what makes Arena fair: both players get the exact
 * same pack, and the correct answers are never shipped to the client until a
 * player has submitted.
 */
export interface QuestionPackDoc {
  topic: string;
  difficulty: Difficulty;
  /** Full questions with `correctIndex` + `explanation` — server-only. */
  questions: QuizQuestion[];
  /** Owner id of whoever generated the pack. */
  createdBy: string;
  createdAt: Date;
}

/** One player's graded result within a duel. */
export interface ArenaResult {
  ownerId: string;
  name: string;
  image?: string;
  isGuest: boolean;
  /** The answer index chosen for each question (0-3, or -1 if skipped). */
  answers: number[];
  score: number;
  total: number;
  /** Wall-clock time the player took, in milliseconds. */
  timeMs: number;
  /** Server-computed duel points (correctness + speed + perfect bonus). */
  points: number;
  submittedAt: Date;
}

export type ArenaStatus = "open" | "complete";

/**
 * An async duel: two players take the same {@link QuestionPackDoc}. The match
 * is `rated` only when both participants are signed-in (non-guest) users.
 */
export interface ArenaMatchDoc {
  /** Short human-shareable code used in the duel URL. */
  code: string;
  packId: string;
  topic: string;
  difficulty: Difficulty;
  numQuestions: number;
  timeLimitSec: number;
  status: ArenaStatus;
  createdBy: string;
  results: ArenaResult[];
  /** True once finalized with two signed-in players. */
  rated: boolean;
  createdAt: Date;
}

/**
 * A player's Elo rating for a given scope. `scope` is `"global"` for the
 * overall ladder, or `"topic:<key>"` for a per-topic ladder.
 */
export interface ArenaRatingDoc {
  ownerId: string;
  name: string;
  image?: string;
  scope: string;
  /** Display topic for topic-scoped ratings. */
  topic?: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: Date;
}
