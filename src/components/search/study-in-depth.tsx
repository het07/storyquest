"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  Layers,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import type { DeepDive, Difficulty, SearchResult } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ListenButton } from "@/components/voice/listen-button";
import {
  useVoiceCommands,
  useVoiceMode,
} from "@/components/voice/voice-mode-provider";

function buildContext(result: SearchResult): string {
  const takeaways = result.keyTakeaways.length
    ? `Key takeaways: ${result.keyTakeaways.join("; ")}.`
    : "";
  return `${result.tldr} ${takeaways}`.trim();
}

function buildNarration(guide: DeepDive): string {
  const parts = [
    guide.overview,
    ...guide.sections.map(
      (s) =>
        `${s.title}. ${s.content}` +
        (s.keyPoints.length ? ` Key points: ${s.keyPoints.join(". ")}.` : "")
    ),
  ];
  if (guide.examples.length) {
    parts.push(`Examples: ${guide.examples.join(". ")}.`);
  }
  return parts.join(" ");
}

export function StudyInDepth({
  result,
  onExploreQuestion,
}: {
  result: SearchResult;
  onExploreQuestion?: (question: string) => void;
}) {
  const voice = useVoiceMode();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [guide, setGuide] = React.useState<DeepDive | null>(null);
  const cacheKey = result.query;
  const cacheRef = React.useRef<Map<string, DeepDive>>(new Map());
  const spokenRef = React.useRef<string | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Reset when the topic changes.
  React.useEffect(() => {
    setOpen(false);
    setError(null);
    setGuide(cacheRef.current.get(cacheKey) ?? null);
    spokenRef.current = null;
  }, [cacheKey]);

  const load = React.useCallback(async () => {
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setGuide(cached);
      return cached;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: result.query,
          context: buildContext(result),
          difficulty: bumpDifficulty(result.difficulty),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't build a deeper guide.");
      }
      const data: DeepDive = await res.json();
      cacheRef.current.set(cacheKey, data);
      setGuide(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, result]);

  const openAndLoad = React.useCallback(async () => {
    setOpen(true);
    const data = guide ?? (await load());
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return data;
  }, [guide, load]);

  // Auto-narrate the deep dive when voice mode is on.
  React.useEffect(() => {
    if (!voice.enabled || !open || !guide) return;
    if (spokenRef.current === guide.topic) return;
    spokenRef.current = guide.topic;
    void voice.speak(
      `Here's a deeper look at ${guide.topic}. ${buildNarration(guide)} Say explore, then a follow-up question, to go further.`
    );
  }, [voice, open, guide]);

  useVoiceCommands("deep-dive", [
    {
      pattern:
        /\b(study in depth|go deeper|dive deeper|tell me more|in depth|learn more|deeper)\b/,
      description: "Open an in-depth study guide",
      run: () => {
        void openAndLoad();
      },
    },
    {
      pattern: /\b(read deep|read guide|read in depth)\b/,
      description: "Read the in-depth guide aloud",
      run: () => {
        if (guide) void voice.speak(buildNarration(guide));
        else void openAndLoad();
      },
    },
  ]);

  return (
    <div className="space-y-4">
      <Button
        type="button"
        size="sm"
        variant={open ? "default" : "outline"}
        className={cn(
          "gap-2 rounded-full",
          open && "bg-brand-gradient text-white hover:opacity-90"
        )}
        onClick={() => {
          if (open) setOpen(false);
          else void openAndLoad();
        }}
        disabled={loading}
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Layers className="size-4" />
        )}
        Study in depth
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-fuchsia-500/[0.03]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="size-4" />
                  In-depth study
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A richer guide for {result.query}
                </p>
              </div>
              {guide && (
                <ListenButton text={buildNarration(guide)} label="Listen" />
              )}
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {loading && !guide && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Loader2 className="size-7 animate-spin text-primary" />
                  <p className="text-sm font-medium">Building a deeper guide…</p>
                  <p className="text-xs text-muted-foreground">
                    Expanding mechanisms, examples, and misconceptions.
                  </p>
                </div>
              )}

              {error && !guide && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="size-7 text-destructive" />
                  <p className="text-sm font-medium">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full"
                    onClick={() => void load()}
                  >
                    <RotateCcw className="size-3.5" />
                    Try again
                  </Button>
                </div>
              )}

              {guide && (
                <>
                  <p className="text-pretty text-base leading-relaxed">
                    {guide.overview}
                  </p>

                  <div className="space-y-4">
                    {guide.sections.map((section, i) => (
                      <section
                        key={`${section.title}-${i}`}
                        className="rounded-xl border border-border/60 bg-card/80 p-4"
                      >
                        <h3 className="flex items-center gap-2 font-semibold">
                          <BookOpen className="size-4 text-primary" />
                          {section.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {section.content}
                        </p>
                        {section.keyPoints.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {section.keyPoints.map((point, j) => (
                              <li
                                key={j}
                                className="flex gap-2 text-sm leading-relaxed"
                              >
                                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>

                  {guide.examples.length > 0 && (
                    <section>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Lightbulb className="size-4 text-amber-500" />
                        Concrete examples
                      </h3>
                      <ul className="space-y-2">
                        {guide.examples.map((ex, i) => (
                          <li
                            key={i}
                            className="rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-sm leading-relaxed"
                          >
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {guide.misconceptions.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold">
                        Common misconceptions
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {guide.misconceptions.map((m, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-border/50 bg-card p-4 text-sm"
                          >
                            <p className="font-medium text-rose-600 dark:text-rose-400">
                              Myth: {m.myth}
                            </p>
                            <p className="mt-2 text-muted-foreground">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                Reality:
                              </span>{" "}
                              {m.reality}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {guide.furtherQuestions.length > 0 && (
                    <section>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <MessageCircleQuestion className="size-4 text-primary" />
                        Explore further
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {guide.furtherQuestions.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => onExploreQuestion?.(q)}
                            className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-left text-xs font-medium transition-colors hover:border-primary/50 hover:bg-accent"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Nudge the deep dive one step deeper than the surface summary. */
function bumpDifficulty(d: Difficulty): Difficulty {
  if (d === "beginner") return "intermediate";
  if (d === "intermediate") return "advanced";
  return "advanced";
}
