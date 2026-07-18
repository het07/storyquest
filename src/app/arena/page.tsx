import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Swords, TrendingUp } from "lucide-react";

import { auth } from "@/auth";
import { resolveIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";
import {
  getLeaderboard,
  getMyMatches,
  getRatedTopics,
  getRating,
} from "@/lib/arena-db";
import { ChallengeForm } from "@/components/arena/challenge-form";
import { ArenaLeaderboard } from "@/components/arena/arena-leaderboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena",
  description:
    "Challenge friends to knowledge duels, climb the leaderboard, and earn Arena rating on topics you've explored.",
};

export default async function ArenaPage() {
  const [{ ownerId }, session] = await Promise.all([resolveIdentity(), auth()]);
  const signedIn = !!session?.user?.id;

  const [globalBoard, topics, rating, myMatches] = await Promise.all([
    getLeaderboard("global"),
    getRatedTopics(),
    signedIn ? getRating(ownerId!, "global") : Promise.resolve(null),
    getMyMatches(ownerId),
  ]);

  const hasRatingHistory =
    rating && (rating.wins > 0 || rating.losses > 0 || rating.draws > 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-white">
            <Swords className="size-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Arena</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Turn what you just learned into a challenge. Everyone with the link takes
          the same questions — fastest, most accurate answers climb the leaderboard.
        </p>
      </header>

      {hasRatingHistory && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <RatingStat label="Arena rating" value={rating!.rating} accent />
          <RatingStat label="Wins" value={rating!.wins} />
          <RatingStat label="Losses" value={rating!.losses} />
          <RatingStat label="Draws" value={rating!.draws} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Swords className="size-4 text-primary" />
              <h2 className="font-semibold">Start a challenge</h2>
            </div>
            <ChallengeForm />
            {!signedIn && (
              <p className="mt-3 text-xs text-muted-foreground">
                You can play as a guest, but rated games and leaderboard rank require
                signing in.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <h2 className="font-semibold">Your recent challenges</h2>
            </div>
            {myMatches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No challenges yet. Create one above or challenge from any topic you explore.
              </p>
            ) : (
              <ul className="space-y-2">
                {myMatches.map((m) => (
                  <li key={m.code}>
                    <Link
                      href={`/arena/${m.code}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.topic}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {m.difficulty} · {m.playerCount}{" "}
                          {m.playerCount === 1 ? "player" : "players"}
                          {m.rated ? " · rated" : ""}
                        </p>
                      </div>
                      <StatusPill match={m} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <ArenaLeaderboard initialGlobal={globalBoard} topics={topics} />
      </div>
    </div>
  );
}

function RatingStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent
          ? "border-primary/30 bg-primary/5"
          : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {accent && <TrendingUp className="size-3.5" />}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusPill({
  match,
}: {
  match: { myRank: number | null; playerCount: number };
}) {
  if (match.myRank === null) {
    return (
      <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Not played
      </span>
    );
  }
  const top = match.myRank === 1 && match.playerCount > 1;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
        top
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-accent text-muted-foreground"
      )}
    >
      {match.playerCount > 1 ? `#${match.myRank} of ${match.playerCount}` : "Played"}
    </span>
  );
}
