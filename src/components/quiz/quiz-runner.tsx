"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import type { Difficulty, Quiz } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Phase = "loading" | "error" | "playing" | "done";

export function QuizRunner({
  topic,
  context,
  difficulty = "intermediate",
  onClose,
}: {
  topic: string;
  context?: string;
  difficulty?: Difficulty;
  onClose?: () => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [current, setCurrent] = React.useState(0);
  const [answers, setAnswers] = React.useState<number[]>([]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [xp, setXp] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setPhase("loading");
    setError(null);
    setQuiz(null);
    setCurrent(0);
    setAnswers([]);
    setSelected(null);
    setXp(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, context, difficulty }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't build a quiz.");
      }
      const data: Quiz = await res.json();
      setQuiz(data);
      setPhase("playing");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, [topic, context, difficulty]);

  React.useEffect(() => {
    load();
  }, [load]);

  const question = quiz?.questions[current];
  const answered = selected !== null;
  const isLast = quiz ? current === quiz.questions.length - 1 : false;

  function choose(index: number) {
    if (answered) return;
    setSelected(index);
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = index;
      return next;
    });
  }

  async function finish(finalAnswers: number[]) {
    if (!quiz) return;
    const score = quiz.questions.reduce(
      (acc, q, i) => acc + (finalAnswers[i] === q.correctIndex ? 1 : 0),
      0
    );
    setPhase("done");
    try {
      const res = await fetch("/api/quiz/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty: quiz.difficulty,
          score,
          total: quiz.questions.length,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data.xp === "number") setXp(data.xp);
    } catch {
      /* result screen still shows without XP */
    }
  }

  function next() {
    if (!quiz) return;
    if (isLast) {
      void finish(answers);
    } else {
      setCurrent((c) => c + 1);
      setSelected(answers[current + 1] ?? null);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="font-medium">Building your quiz…</p>
        <p className="text-sm text-muted-foreground">
          Generating questions about {topic}.
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="font-medium">Quiz unavailable</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={load} variant="outline" className="mt-2 gap-2">
          <RotateCcw className="size-4" />
          Try again
        </Button>
      </div>
    );
  }

  if (phase === "done" && quiz) {
    const score = quiz.questions.reduce(
      (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
      0
    );
    const total = quiz.questions.length;
    const pct = Math.round((score / total) * 100);
    const passed = pct >= 70;

    return (
      <div className="space-y-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-2 text-center"
        >
          <div
            className={cn(
              "grid size-16 place-items-center rounded-2xl",
              passed
                ? "bg-brand-gradient text-white"
                : "bg-accent text-muted-foreground"
            )}
          >
            <Trophy className="size-8" />
          </div>
          <p className="text-2xl font-bold">
            {score} / {total}
          </p>
          <p className="text-sm text-muted-foreground">
            {passed
              ? "Great work — you've got this down!"
              : "Nice try — review the explanations and go again."}
          </p>
          {xp !== null && (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="size-4" />+{xp} XP
            </div>
          )}
        </motion.div>

        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {quiz.questions.map((q, i) => {
            const correct = answers[i] === q.correctIndex;
            return (
              <div
                key={q.id}
                className="rounded-xl border border-border/60 p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white",
                      correct ? "bg-emerald-500" : "bg-rose-500"
                    )}
                  >
                    {correct ? (
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

        <div className="flex gap-2">
          <Button onClick={load} variant="outline" className="flex-1 gap-2">
            <RotateCcw className="size-4" />
            Retry
          </Button>
          <Button onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    );
  }

  if (!question || !quiz) return null;

  const progress = ((current + (answered ? 1 : 0)) / quiz.questions.length) * 100;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {current + 1} of {quiz.questions.length}
          </span>
          <span className="capitalize">{quiz.difficulty}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-brand-gradient"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <p className="text-lg font-semibold text-pretty">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((option, i) => {
              const isCorrect = i === question.correctIndex;
              const isChosen = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-left text-sm transition-colors",
                    !answered && "hover:border-primary/50 hover:bg-accent",
                    answered && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    answered && isChosen && !isCorrect && "border-rose-500/50 bg-rose-500/10",
                    answered && !isCorrect && !isChosen && "opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium",
                      answered && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                      answered && isChosen && !isCorrect && "border-rose-500 bg-rose-500 text-white",
                      (!answered || (!isCorrect && !isChosen)) && "border-border"
                    )}
                  >
                    {answered && isCorrect ? (
                      <Check className="size-3.5" />
                    ) : answered && isChosen && !isCorrect ? (
                      <X className="size-3.5" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl bg-accent/60 p-3 text-sm"
              >
                <span className="font-medium">
                  {selected === question.correctIndex ? "Correct! " : "Not quite. "}
                </span>
                {question.explanation}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <Button onClick={next} disabled={!answered} className="w-full">
        {isLast ? "See results" : "Next question"}
      </Button>
    </div>
  );
}
