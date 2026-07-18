import type { QuizQuestion } from "@/types";
import type { ArenaResult } from "@/types/db";

/** Default duel shape when the challenger doesn't override it. */
export const ARENA_DEFAULTS = {
  numQuestions: 5,
  timeLimitSec: 180,
} as const;

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 10;
export const MIN_TIME_LIMIT = 60;
export const MAX_TIME_LIMIT = 900;

/** Starting Elo for a player with no rated history. */
export const DEFAULT_RATING = 1200;

/** Points awarded per correct answer (kept dominant over speed). */
const POINTS_PER_CORRECT = 100;
/** Extra points for a flawless pack. */
const PERFECT_BONUS = 50;

/** Excludes ambiguous characters (0/O, 1/I/L) for easy sharing. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Generates a short, shareable duel code. */
export function makeMatchCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Normalizes a topic into a stable key for topic-scoped ratings/boards. */
export function topicKey(topic: string): string {
  return topic.trim().toLowerCase().slice(0, 80);
}

/** Builds the rating scope string for a per-topic ladder. */
export function topicScope(topic: string): string {
  return `topic:${topicKey(topic)}`;
}

/** Grades submitted answers against the frozen pack's answer key. */
export function gradeAnswers(
  questions: QuizQuestion[],
  answers: number[]
): number {
  return questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0
  );
}

/**
 * Duel points: correctness dominates, finishing faster (within the limit)
 * earns a modest speed bonus, and a perfect pack earns a flat bonus.
 */
export function computePoints(args: {
  score: number;
  total: number;
  timeMs: number;
  timeLimitSec: number;
}): number {
  const { score, total, timeMs, timeLimitSec } = args;
  const base = score * POINTS_PER_CORRECT;
  const secondsUsed = Math.round(timeMs / 1000);
  const speedBonus = Math.max(0, timeLimitSec - secondsUsed);
  const perfect = total > 0 && score === total ? PERFECT_BONUS : 0;
  return base + speedBonus + perfect;
}

/** Sorts results best-first: points desc, then faster time as tie-break. */
export function rankResults(results: ArenaResult[]): ArenaResult[] {
  return [...results].sort(
    (a, b) => b.points - a.points || a.timeMs - b.timeMs
  );
}

/** Standard Elo expected score for `a` against `b`. */
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/**
 * Elo delta for a single game. `outcome` is 1 (win), 0.5 (draw) or 0 (loss).
 */
export function eloDelta(
  rating: number,
  opponent: number,
  outcome: number,
  k = 32
): number {
  return Math.round(k * (outcome - expectedScore(rating, opponent)));
}

/**
 * Given two ranked-by-points results, returns each player's game outcome
 * (1 win / 0.5 draw / 0 loss). Assumes exactly two results.
 */
export function outcomes(a: ArenaResult, b: ArenaResult): [number, number] {
  if (a.points === b.points) return [0.5, 0.5];
  return a.points > b.points ? [1, 0] : [0, 1];
}

/** Strips the answer key so a pack can be sent to a player who hasn't submitted. */
export function toPlayableQuestions(questions: QuizQuestion[]) {
  return questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
  }));
}
