import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";
import { DEFAULT_RATING, eloDelta, topicScope } from "@/lib/arena";
import type { ArenaMatchDoc, ArenaResult } from "@/types/db";

/**
 * K-factor for multiplayer challenges. Lower than a 1v1 duel because a player
 * effectively plays one game per opponent already present, so deltas add up.
 */
const PAIRWISE_K = 20;

export interface LeaderboardEntry {
  ownerId: string;
  name: string;
  image?: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

/** Reads a leaderboard for a scope (`"global"` or `topic:<key>`). */
export async function getLeaderboard(
  scope: string,
  limit = 25
): Promise<LeaderboardEntry[]> {
  if (!isMongoConfigured()) return [];
  try {
    const { arenaRatings } = await collections();
    const rows = await arenaRatings
      .find({ scope })
      .sort({ rating: -1, wins: -1 })
      .limit(limit)
      .toArray();
    return rows.map((r) => ({
      ownerId: r.ownerId,
      name: r.name,
      image: r.image,
      rating: r.rating,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
    }));
  } catch (error) {
    console.error("[arena] leaderboard read failed:", error);
    return [];
  }
}

/** Lists the topics that currently have a rated ladder, most active first. */
export async function getRatedTopics(limit = 20): Promise<string[]> {
  if (!isMongoConfigured()) return [];
  try {
    const { arenaRatings } = await collections();
    const rows = await arenaRatings
      .aggregate<{ _id: string; count: number }>([
        { $match: { scope: { $regex: "^topic:" }, topic: { $ne: null } } },
        { $group: { _id: "$topic", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .toArray();
    return rows.map((r) => r._id).filter(Boolean);
  } catch (error) {
    console.error("[arena] rated topics read failed:", error);
    return [];
  }
}

export interface MyMatchSummary {
  code: string;
  topic: string;
  difficulty: string;
  rated: boolean;
  playerCount: number;
  myPoints: number | null;
  /** The player's placement in the match (1 = best), or null if not played. */
  myRank: number | null;
  createdAt: string;
}

/** Recent challenges the player created or took part in, newest first. */
export async function getMyMatches(
  ownerId: string | null,
  limit = 8
): Promise<MyMatchSummary[]> {
  if (!isMongoConfigured() || !ownerId) return [];
  try {
    const { arenaMatches } = await collections();
    const rows = await arenaMatches
      .find({ $or: [{ createdBy: ownerId }, { "results.ownerId": ownerId }] })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return rows.map((m) => {
      const ranked = [...m.results].sort(
        (a, b) => b.points - a.points || a.timeMs - b.timeMs
      );
      const idx = ranked.findIndex((r) => r.ownerId === ownerId);
      return {
        code: m.code,
        topic: m.topic,
        difficulty: m.difficulty,
        rated: m.rated,
        playerCount: m.results.length,
        myPoints: idx >= 0 ? ranked[idx].points : null,
        myRank: idx >= 0 ? idx + 1 : null,
        createdAt: m.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error("[arena] my matches read failed:", error);
    return [];
  }
}

/** A player's rating for a scope, or the default if they have no history. */
export async function getRating(
  ownerId: string | null,
  scope = "global"
): Promise<{ rating: number; wins: number; losses: number; draws: number }> {
  const fallback = { rating: DEFAULT_RATING, wins: 0, losses: 0, draws: 0 };
  if (!isMongoConfigured() || !ownerId) return fallback;
  try {
    const { arenaRatings } = await collections();
    const doc = await arenaRatings.findOne({ ownerId, scope });
    if (!doc) return fallback;
    return {
      rating: doc.rating,
      wins: doc.wins,
      losses: doc.losses,
      draws: doc.draws,
    };
  } catch {
    return fallback;
  }
}

/** points → pairwise Elo outcome for `a` vs `b`. */
function pairOutcome(a: ArenaResult, b: ArenaResult): number {
  if (a.points === b.points) return 0.5;
  return a.points > b.points ? 1 : 0;
}

/**
 * Rates a newly-submitted player against every signed-in opponent already in
 * the match, on one scope (global or a topic ladder). Each opponent counts as
 * a single pairwise game, so the joiner's delta is the sum across opponents,
 * while each opponent gets their one delta. Returns the joiner's total delta.
 */
async function rateJoinerForScope(
  scope: string,
  topic: string | undefined,
  joiner: ArenaResult,
  opponents: ArenaResult[]
): Promise<number> {
  const { arenaRatings } = await collections();

  const ids = [joiner.ownerId, ...opponents.map((o) => o.ownerId)];
  const docs = await arenaRatings.find({ scope, ownerId: { $in: ids } }).toArray();
  const ratingOf = (id: string) =>
    docs.find((d) => d.ownerId === id)?.rating ?? DEFAULT_RATING;

  const joinerRating = ratingOf(joiner.ownerId);
  let joinerDelta = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;

  const opponentWrites = opponents.map((o) => {
    const oppRating = ratingOf(o.ownerId);
    const outcome = pairOutcome(joiner, o);
    joinerDelta += eloDelta(joinerRating, oppRating, outcome, PAIRWISE_K);
    if (outcome === 1) wins += 1;
    else if (outcome === 0) losses += 1;
    else draws += 1;

    const oppOutcome = 1 - outcome;
    const oppDelta = eloDelta(oppRating, joinerRating, oppOutcome, PAIRWISE_K);
    return arenaRatings.updateOne(
      { ownerId: o.ownerId, scope },
      {
        $set: {
          name: o.name,
          image: o.image,
          topic,
          rating: oppRating + oppDelta,
          updatedAt: new Date(),
        },
        $inc: {
          wins: oppOutcome === 1 ? 1 : 0,
          losses: oppOutcome === 0 ? 1 : 0,
          draws: oppOutcome === 0.5 ? 1 : 0,
        },
        $setOnInsert: { ownerId: o.ownerId, scope },
      },
      { upsert: true }
    );
  });

  await Promise.all([
    arenaRatings.updateOne(
      { ownerId: joiner.ownerId, scope },
      {
        $set: {
          name: joiner.name,
          image: joiner.image,
          topic,
          rating: joinerRating + joinerDelta,
          updatedAt: new Date(),
        },
        $inc: { wins, losses, draws },
        $setOnInsert: { ownerId: joiner.ownerId, scope },
      },
      { upsert: true }
    ),
    ...opponentWrites,
  ]);

  return joinerDelta;
}

/**
 * Applies pairwise Elo when a player submits: they play one rated game against
 * each signed-in opponent already in the match (global + topic ladders). Guests
 * never affect ratings. Returns the joiner's global rating delta, or `undefined`
 * if nothing was rated (guest, or no signed-in opponents yet).
 */
export async function applyResultRatings(
  match: ArenaMatchDoc,
  joiner: ArenaResult
): Promise<number | undefined> {
  if (joiner.isGuest) return undefined;
  const opponents = match.results.filter(
    (r) => r.ownerId !== joiner.ownerId && !r.isGuest
  );
  if (opponents.length === 0) return undefined;

  const [globalDelta] = await Promise.all([
    rateJoinerForScope("global", undefined, joiner, opponents),
    rateJoinerForScope(topicScope(match.topic), match.topic, joiner, opponents),
  ]);

  return globalDelta;
}
