import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Compass,
  Flame,
  GraduationCap,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
} from "lucide-react";

import { auth } from "@/auth";
import { resolveIdentity } from "@/lib/identity";
import { getDashboardStats } from "@/lib/stats";
import { getRating } from "@/lib/arena-db";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { XpChart } from "@/components/dashboard/xp-chart";
import { AccuracyChart } from "@/components/dashboard/accuracy-chart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track your learning streak, XP, and quiz progress.",
};

export default async function DashboardPage() {
  const [{ ownerId }, session] = await Promise.all([resolveIdentity(), auth()]);
  const [stats, arena] = await Promise.all([
    getDashboardStats(ownerId),
    getRating(ownerId, "global"),
  ]);
  const firstName = session?.user?.name?.split(" ")[0];
  const arenaMatches = arena.wins + arena.losses + arena.draws;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {firstName ? `Welcome back, ${firstName}` : "Your learning dashboard"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {stats.hasData
            ? "Here's how your learning is going."
            : "Explore a topic and take a quiz to start tracking your progress."}
        </p>
      </header>

      {!stats.hasData ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Sparkles}
              label="Total XP"
              value={stats.totalXp.toLocaleString()}
              accent
            />
            <StatCard
              icon={Flame}
              label="Day streak"
              value={stats.currentStreak}
              hint={`Longest: ${stats.longestStreak}`}
            />
            <StatCard
              icon={GraduationCap}
              label="Quizzes taken"
              value={stats.quizzesTaken}
            />
            <StatCard
              icon={Target}
              label="Avg accuracy"
              value={`${stats.avgAccuracy}%`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <h2 className="font-semibold">XP earned (last 14 days)</h2>
              </div>
              <XpChart data={stats.dailyXp} />
            </section>

            <section className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <h2 className="font-semibold">Recent quiz accuracy</h2>
              </div>
              {stats.recentAttempts.length > 0 ? (
                <AccuracyChart data={stats.recentAttempts} />
              ) : (
                <div className="flex h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
                  Take a quiz to see your accuracy trend.
                </div>
              )}
            </section>
          </div>

          <section className="flex flex-col items-start gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
              <Swords className="size-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-semibold">Knowledge Arena</h2>
              <p className="text-sm text-muted-foreground">
                {arenaMatches > 0
                  ? `Rating ${arena.rating} · ${arena.wins}W · ${arena.losses}L · ${arena.draws}D`
                  : "Challenge friends on a topic you've explored — everyone plays the same questions."}
              </p>
            </div>
            <Link
              href="/arena"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
            >
              {arenaMatches > 0 ? "View Arena" : "Enter Arena"}
            </Link>
          </section>

          {stats.recentTopics.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <h2 className="font-semibold">Continue learning</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.recentTopics.map((topic) => (
                  <Link
                    key={topic.query}
                    href={`/explore?topic=${encodeURIComponent(topic.query)}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    <span className="font-medium">{topic.query}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 p-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white">
        <Sparkles className="size-7" />
      </div>
      <p className="mt-4 text-lg font-semibold">No activity yet</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Search a topic, listen to the breakdown, and test yourself with a quiz.
        Your streak, XP, and progress will show up here.
      </p>
      <Link
        href="/explore"
        className={cn(buttonVariants(), "mt-5 rounded-full")}
      >
        Start exploring
      </Link>
    </div>
  );
}
