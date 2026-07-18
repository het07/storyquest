"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  Loader2,
  LogIn,
  Minus,
  Swords,
  Timer,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";

import type { Difficulty } from "@/types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { useVoiceCommands, useVoiceMode } from "@/components/voice/voice-mode-provider";

type Phase = "loading" | "error" | "lobby" | "playing" | "submitting" | "result";

interface PlayableQuestion {
  id: string;
  question: string;
  options: string[];
}
interface RevealQuestion extends PlayableQuestion {
  correctIndex: number;
  explanation: string;
}
interface ResultRow {
  ownerId: string;
  name: string;
  image?: string;
  isGuest: boolean;
  score: number;
  total: number;
  timeMs: number;
  points: number;
  rank: number;
  mine: boolean;
}
interface MatchData {
  code: string;
  topic: string;
  difficulty: Difficulty;
  numQuestions: number;
  timeLimitSec: number;
  status: "open" | "complete";
  rated: boolean;
  isGuest: boolean;
  hasPlayed: boolean;
  canPlay: boolean;
  results: ResultRow[];
  questions?: PlayableQuestion[];
  reveal?: RevealQuestion[];
  myAnswers?: number[];
}

function letterIndex(letter: string): number {
  const c = letter.toLowerCase();
  if (c === "a" || c === "1" || c === "one") return 0;
  if (c === "b" || c === "2" || c === "two") return 1;
  if (c === "c" || c === "3" || c === "three") return 2;
  if (c === "d" || c === "4" || c === "four") return 3;
  return -1;
}

function fmtTime(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function ArenaMatch({ code }: { code: string }) {
  const voice = useVoiceMode();

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [match, setMatch] = React.useState<MatchData | null>(null);

  const [questions, setQuestions] = React.useState<PlayableQuestion[]>([]);
  const [current, setCurrent] = React.useState(0);
  const [answers, setAnswers] = React.useState<number[]>([]);
  const [remaining, setRemaining] = React.useState(0);
  const startRef = React.useRef<number>(0);
  // Mirror of `answers` for reading the latest value in the timer / submit
  // without an impure setState updater.
  const answersRef = React.useRef<number[]>([]);

  const [reveal, setReveal] = React.useState<RevealQuestion[] | null>(null);
  const [myAnswers, setMyAnswers] = React.useState<number[]>([]);
  const [results, setResults] = React.useState<ResultRow[]>([]);
  const [ratingDelta, setRatingDelta] = React.useState<number | undefined>();
  const [justPlayed, setJustPlayed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/arena/${code}` : "";

  const load = React.useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(`/api/arena/match/${code}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Duel not found.");
      const m = data as MatchData;
      setMatch(m);
      setResults(m.results ?? []);
      if (m.hasPlayed) {
        setReveal(m.reveal ?? null);
        setMyAnswers(m.myAnswers ?? []);
        setPhase("result");
      } else if (m.canPlay && m.questions) {
        setQuestions(m.questions);
        answersRef.current = new Array(m.questions.length).fill(-1);
        setAnswers(answersRef.current);
        setPhase("lobby");
      } else {
        // Full for this viewer, or complete and they never played.
        setPhase("result");
      }
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, [code]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submit = React.useCallback(
    async (finalAnswers: number[]) => {
      setPhase("submitting");
      const timeMs = Date.now() - startRef.current;
      try {
        const res = await fetch(`/api/arena/match/${code}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: finalAnswers, timeMs }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't submit your round.");
        setReveal(data.reveal ?? null);
        setMyAnswers(data.myAnswers ?? finalAnswers);
        setResults(data.results ?? []);
        setRatingDelta(data.ratingDelta);
        setJustPlayed(true);
        setMatch((m) => (m ? { ...m, hasPlayed: true } : m));
        setPhase("result");
      } catch (err) {
        toast.error((err as Error).message);
        setPhase("playing");
      }
    },
    [code]
  );

  const start = React.useCallback(() => {
    startRef.current = Date.now();
    setCurrent(0);
    setRemaining(match?.timeLimitSec ?? 180);
    setPhase("playing");
    if (voice.enabled && questions[0]) {
      void voice.speak(
        `Duel started. Question 1. ${questions[0].question}. ${questions[0].options
          .map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`)
          .join(". ")}. Say A, B, C, or D.`
      );
    }
  }, [match, questions, voice]);

  const choose = React.useCallback(
    (index: number) => {
      if (phase !== "playing" || index < 0 || index > 3) return;
      const next = [...answersRef.current];
      next[current] = index;
      answersRef.current = next;
      setAnswers(next);
    },
    [current, phase]
  );

  const next = React.useCallback(() => {
    if (phase !== "playing") return;
    if (current >= questions.length - 1) {
      void submit(answersRef.current);
    } else {
      setCurrent((c) => c + 1);
    }
  }, [current, phase, questions.length, submit]);

  // Countdown timer while playing; auto-submit at zero.
  React.useEffect(() => {
    if (phase !== "playing") return;
    if (remaining <= 0) {
      void submit(answersRef.current);
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, remaining, submit]);

  useVoiceCommands("arena-play", [
    {
      pattern:
        /^(?:(?:option|answer|choose|pick)\s+)?([abcd]|1|2|3|4|one|two|three|four)$/,
      description: "Answer with A, B, C, or D",
      run: (m) => {
        if (phase !== "playing") return;
        const idx = letterIndex(m[1] ?? "");
        if (idx >= 0) choose(idx);
      },
    },
    {
      pattern: /\b(next|continue|submit|done)\b/,
      description: "Go to the next question or submit",
      run: () => {
        if (phase === "playing") next();
      },
    },
  ]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading duel…</p>
      </div>
    );
  }

  if (phase === "error" || !match) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="font-medium">Challenge unavailable</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link href="/arena" className={cn(buttonVariants({ variant: "outline" }), "mt-2")}>
          Back to Arena
        </Link>
      </div>
    );
  }

  const minutes = Math.round(match.timeLimitSec / 60);

  // ---- Lobby ----
  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white">
            <Swords className="size-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">{match.topic}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {match.numQuestions} questions · {minutes} min ·{" "}
            <span className="capitalize">{match.difficulty}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {!match.isGuest
              ? "Rated challenge — climb the leaderboard."
              : "Practice challenge — sign in to make it rated."}
          </p>
        </div>

        {match.isGuest && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <LogIn className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span className="text-muted-foreground">
              You&apos;re playing as a guest. Rated games and leaderboard rank require signing in.
            </span>
          </div>
        )}

        {results.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "player has" : "players have"} played · top
            score {results[0].points} pts — beat it!
          </p>
        )}

        <Button onClick={start} className="w-full gap-2" size="lg">
          <Swords className="size-4" />
          Start challenge
        </Button>
      </div>
    );
  }

  // ---- Playing / submitting ----
  if (phase === "playing" || phase === "submitting") {
    const q = questions[current];
    const answered = answers[current] >= 0;
    const isLast = current === questions.length - 1;
    const lowTime = remaining <= 15;

    if (phase === "submitting" || !q) {
      return (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Scoring your round…</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Question {current + 1} of {questions.length}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium tabular-nums",
              lowTime ? "bg-destructive/10 text-destructive" : "bg-accent"
            )}
          >
            <Timer className="size-4" />
            {fmtTime(remaining * 1000)}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-brand-gradient"
            animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <p className="text-lg font-semibold text-pretty">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                    answers[current] === i
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium",
                      answers[current] === i
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <Button onClick={next} disabled={!answered} className="w-full">
          {isLast ? "Submit answers" : "Next question"}
        </Button>
      </div>
    );
  }

  // ---- Result ----
  const mine = results.find((r) => r.mine);
  const rank = mine?.rank ?? null;
  const players = results.length;
  const isWinner = rank === 1 && players > 1;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <div
          className={cn(
            "mx-auto grid size-14 place-items-center rounded-2xl",
            isWinner ? "bg-brand-gradient text-white" : "bg-accent text-primary"
          )}
        >
          <Trophy className="size-7" />
        </div>
        <h1 className="mt-3 text-xl font-bold">{match.topic}</h1>
        {mine ? (
          <p className="mt-1 text-sm text-muted-foreground">
            You scored {mine.score}/{mine.total} · {mine.points} pts · {fmtTime(mine.timeMs)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            You haven&apos;t played this challenge yet.
          </p>
        )}
        {mine && (
          <div className="mt-3 inline-flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-semibold",
                isWinner
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-accent text-foreground"
              )}
            >
              {players > 1 ? `#${rank} of ${players}` : "Score locked in"}
            </span>
            {typeof ratingDelta === "number" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium",
                  ratingDelta >= 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                )}
              >
                {ratingDelta >= 0 ? "+" : ""}
                {ratingDelta} rating
              </span>
            )}
          </div>
        )}
        {mine && justPlayed && players === 1 && (
          <p className="mt-2 text-xs text-muted-foreground">
            You&apos;re first in! Share the link so others can take the same questions.
          </p>
        )}
        {mine && !match.rated && match.isGuest && (
          <p className="mt-2 text-xs text-muted-foreground">
            Practice run — sign in so your challenges count toward your rating.
          </p>
        )}
      </div>

      {/* Scoreboard */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Leaderboard{players > 0 ? ` · ${players}` : ""}
          </h2>
          <Button variant="outline" size="sm" onClick={copy} className="h-7 gap-1.5 rounded-full text-xs">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <UserPlus className="size-3.5" />}
            Invite
          </Button>
        </div>
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((r) => (
              <ScoreRow key={r.ownerId} row={r} highlight={r.rank === 1 && players > 1} />
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No scores yet.
          </p>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Anyone with the link can join — the board updates as they finish.
        </p>
      </div>

      {/* Answer review */}
      {reveal && myAnswers.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Review</h2>
          <div className="space-y-3">
            {reveal.map((q, i) => {
              const correct = myAnswers[i] === q.correctIndex;
              return (
                <div key={q.id} className="rounded-xl border border-border/60 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white",
                        myAnswers[i] === -1
                          ? "bg-muted-foreground"
                          : correct
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                      )}
                    >
                      {myAnswers[i] === -1 ? (
                        <Minus className="size-3" />
                      ) : correct ? (
                        <Check className="size-3" />
                      ) : (
                        <X className="size-3" />
                      )}
                    </span>
                    <div>
                      <p className="font-medium">{q.question}</p>
                      <p className="mt-1 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {q.options[q.correctIndex]}
                        </span>{" "}
                        — {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link
        href="/arena"
        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
      >
        Back to Arena
      </Link>
    </div>
  );
}

function ScoreRow({ row, highlight }: { row: ResultRow; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3",
        highlight ? "border-primary/40 bg-primary/5" : "border-border/60",
        row.mine && "ring-1 ring-primary/30"
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold">
        {row.rank}
      </span>
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.image} alt="" className="size-8 rounded-full" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold">
          {row.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {row.name}
          {row.mine && <span className="ml-1 text-xs text-primary">(you)</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.score}/{row.total} correct · {fmtTime(row.timeMs)}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
        {row.points}
      </span>
    </div>
  );
}
