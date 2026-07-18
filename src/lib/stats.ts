import type { Difficulty } from "@/types";
import { collections } from "@/lib/db";
import { isMongoConfigured } from "@/lib/mongodb";

export interface DailyXp {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Jul 18"
  xp: number;
}

export interface AttemptPoint {
  topic: string;
  accuracy: number; // 0-100
  score: number;
  total: number;
  difficulty: Difficulty;
  date: string;
}

export interface RecentTopic {
  query: string;
  source: string;
  date: string;
}

export interface DashboardStats {
  totalXp: number;
  quizzesTaken: number;
  avgAccuracy: number; // 0-100
  totalSearches: number;
  currentStreak: number;
  longestStreak: number;
  dailyXp: DailyXp[];
  recentAttempts: AttemptPoint[];
  recentTopics: RecentTopic[];
  hasData: boolean;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shortLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function computeStreaks(dayKeys: Set<string>): {
  current: number;
  longest: number;
} {
  if (dayKeys.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(dayKeys).sort(); // ascending
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
    const cur = new Date(`${sorted[i]}T00:00:00Z`).getTime();
    const diffDays = Math.round((cur - prev) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak: walk back from today (allow "today or yesterday" start).
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  let current = 0;
  if (dayKeys.has(today) || dayKeys.has(yesterday)) {
    const cursor = new Date(`${dayKeys.has(today) ? today : yesterday}T00:00:00Z`);
    while (dayKeys.has(dayKey(cursor))) {
      current += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  return { current, longest };
}

const EMPTY: DashboardStats = {
  totalXp: 0,
  quizzesTaken: 0,
  avgAccuracy: 0,
  totalSearches: 0,
  currentStreak: 0,
  longestStreak: 0,
  dailyXp: [],
  recentAttempts: [],
  recentTopics: [],
  hasData: false,
};

/** Aggregates a learner's activity into dashboard-ready stats. */
export async function getDashboardStats(
  ownerId: string | null
): Promise<DashboardStats> {
  if (!ownerId || !isMongoConfigured()) return EMPTY;

  try {
    const { quizAttempts, searchQueries } = await collections();

    const [attempts, searches] = await Promise.all([
      quizAttempts
        .find({ ownerId })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray(),
      searchQueries
        .find({ ownerId })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray(),
    ]);

    const totalXp = attempts.reduce((sum, a) => sum + (a.xp ?? 0), 0);
    const quizzesTaken = attempts.length;
    const totalScore = attempts.reduce((sum, a) => sum + (a.score ?? 0), 0);
    const totalPossible = attempts.reduce((sum, a) => sum + (a.total ?? 0), 0);
    const avgAccuracy =
      totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    // XP per day for the last 14 days.
    const xpByDay = new Map<string, number>();
    for (const a of attempts) {
      const key = dayKey(new Date(a.createdAt));
      xpByDay.set(key, (xpByDay.get(key) ?? 0) + (a.xp ?? 0));
    }
    const dailyXp: DailyXp[] = [];
    for (let i = 13; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * 86_400_000));
      dailyXp.push({ date: key, label: shortLabel(key), xp: xpByDay.get(key) ?? 0 });
    }

    const recentAttempts: AttemptPoint[] = attempts
      .slice(0, 10)
      .reverse()
      .map((a) => ({
        topic: a.topic,
        accuracy: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
        score: a.score,
        total: a.total,
        difficulty: a.difficulty,
        date: dayKey(new Date(a.createdAt)),
      }));

    // Recent distinct search topics.
    const seen = new Set<string>();
    const recentTopics: RecentTopic[] = [];
    for (const s of searches) {
      const key = s.query.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      recentTopics.push({
        query: s.query,
        source: s.source,
        date: dayKey(new Date(s.createdAt)),
      });
      if (recentTopics.length >= 8) break;
    }

    const activeDays = new Set<string>();
    for (const a of attempts) activeDays.add(dayKey(new Date(a.createdAt)));
    for (const s of searches) activeDays.add(dayKey(new Date(s.createdAt)));
    const { current, longest } = computeStreaks(activeDays);

    return {
      totalXp,
      quizzesTaken,
      avgAccuracy,
      totalSearches: searches.length,
      currentStreak: current,
      longestStreak: longest,
      dailyXp,
      recentAttempts,
      recentTopics,
      hasData: attempts.length > 0 || searches.length > 0,
    };
  } catch (error) {
    console.error("[stats] aggregation failed:", error);
    return EMPTY;
  }
}
