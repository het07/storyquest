"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X } from "lucide-react";

import type { SearchResult } from "@/types";
import { Button } from "@/components/ui/button";
import { QuizButton } from "@/components/quiz/quiz-button";
import { ChallengeButton } from "@/components/arena/challenge-button";

/** How long a learner reads a topic before we surface the quiz / challenge nudge. */
const DELAY_MS = 30_000;
/** Shown at most once per browser session so it never nags. */
const SEEN_KEY = "sq:learning-nudge-seen";

function buildContext(result: SearchResult): string {
  const takeaways = result.keyTakeaways.length
    ? ` Key takeaways: ${result.keyTakeaways.join(". ")}.`
    : "";
  return `${result.tldr}${takeaways}`;
}

/**
 * A gentle, dismissible prompt that slides in after the learner has spent some
 * time on a topic, nudging them toward "Test yourself" and "Challenge a friend"
 * so those features get discovered. Appears at most once per session.
 */
export function LearningNudge({ result }: { result: SearchResult | null }) {
  const [show, setShow] = React.useState(false);
  const dismissedRef = React.useRef(false);

  React.useEffect(() => {
    if (!result || dismissedRef.current) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) {
        dismissedRef.current = true;
        return;
      }
    } catch {
      /* sessionStorage unavailable — still show once in-memory */
    }
    const timer = window.setTimeout(() => setShow(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  // Only ever appears once per session.
  React.useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [show]);

  const dismiss = () => {
    dismissedRef.current = true;
    setShow(false);
  };

  if (!result) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-2xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur-xl sm:inset-x-auto sm:right-6"
          role="dialog"
          aria-label="Try a quiz or challenge"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0 pr-4">
              <p className="text-sm font-semibold">Ready to make it stick?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Test yourself on{" "}
                <span className="font-medium text-foreground">{result.query}</span>, or
                challenge a friend to the same quiz.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <QuizButton
              topic={result.query}
              context={buildContext(result)}
              difficulty={result.difficulty}
            />
            <ChallengeButton
              topic={result.query}
              context={buildContext(result)}
              difficulty={result.difficulty}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            className="mt-1 h-7 w-full text-xs text-muted-foreground"
          >
            Maybe later
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
