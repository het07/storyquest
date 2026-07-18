"use client";

import * as React from "react";
import { Crown, Loader2, Medal, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/arena-db";

type Tab = "global" | "topic";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="size-4 text-amber-500" />;
  if (rank === 2) return <Medal className="size-4 text-slate-400" />;
  if (rank === 3) return <Medal className="size-4 text-amber-700" />;
  return <span className="text-sm font-medium text-muted-foreground">{rank}</span>;
}

function Rows({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <Trophy className="size-7 text-muted-foreground/50" />
        No rated duels yet. Be the first to climb.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {entries.map((e, i) => (
        <li key={e.ownerId} className="flex items-center gap-3 py-2.5">
          <span className="grid size-6 shrink-0 place-items-center">
            <RankBadge rank={i + 1} />
          </span>
          {e.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.image} alt="" className="size-8 rounded-full" />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold">
              {e.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{e.name}</p>
            <p className="text-xs text-muted-foreground">
              {e.wins}W · {e.losses}L · {e.draws}D
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
            {e.rating}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ArenaLeaderboard({
  initialGlobal,
  topics,
}: {
  initialGlobal: LeaderboardEntry[];
  topics: string[];
}) {
  const [tab, setTab] = React.useState<Tab>("global");
  const [topic, setTopic] = React.useState(topics[0] ?? "");
  const [topicEntries, setTopicEntries] = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (tab !== "topic" || !topic) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/arena/leaderboard?scope=topic&topic=${encodeURIComponent(topic)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTopicEntries(d.entries ?? []);
      })
      .catch(() => !cancelled && setTopicEntries([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, topic]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="size-4 text-primary" />
        <h2 className="font-semibold">Leaderboard</h2>
      </div>

      <div className="mb-4 inline-flex rounded-full border border-border/60 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setTab("global")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            tab === "global" ? "bg-accent text-foreground" : "text-muted-foreground"
          )}
        >
          Global
        </button>
        <button
          type="button"
          onClick={() => setTab("topic")}
          disabled={topics.length === 0}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors disabled:opacity-40",
            tab === "topic" ? "bg-accent text-foreground" : "text-muted-foreground"
          )}
        >
          By topic
        </button>
      </div>

      {tab === "topic" && topics.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                topic === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === "global" ? (
        <Rows entries={initialGlobal} />
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Rows entries={topicEntries} />
      )}
    </section>
  );
}
