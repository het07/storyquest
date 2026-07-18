"use client";

import { AlertCircle, BookOpen, Compass } from "lucide-react";

import type { SearchResult } from "@/types";
import { TldrCard } from "@/components/search/tldr-card";
import { KeyTakeaways } from "@/components/search/key-takeaways";
import { ConceptMap } from "@/components/search/concept-map";
import { SourceCard } from "@/components/search/source-card";
import { ListenButton } from "@/components/voice/listen-button";
import { QuizButton } from "@/components/quiz/quiz-button";
import { StudyInDepth } from "@/components/search/study-in-depth";

function buildNarration(result: SearchResult): string {
  const takeaways = result.keyTakeaways.length
    ? ` Key takeaways: ${result.keyTakeaways.join(". ")}.`
    : "";
  return `${result.tldr}${takeaways}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function SearchResults({
  result,
  loading,
  error,
  onConceptSelect,
  quizSlot,
}: {
  result: SearchResult | null;
  loading: boolean;
  error: string | null;
  onConceptSelect: (concept: string) => void;
  quizSlot?: React.ReactNode;
}) {
  if (loading) return <ResultsSkeleton />;

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="mt-3 font-medium">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border/60 p-10 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
          <Compass className="size-7" />
        </div>
        <p className="mt-4 font-medium">Ready when you are</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Search a topic above and we&apos;ll break it down into a clear summary,
          key takeaways, and a map of related ideas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TldrCard
        tldr={result.tldr}
        difficulty={result.difficulty}
        provider={result.source}
        actions={
          <>
            <ListenButton text={buildNarration(result)} label="Listen" />
            <QuizButton
              topic={result.query}
              context={buildNarration(result)}
              difficulty={result.difficulty}
            />
            {quizSlot}
          </>
        }
      />

      <StudyInDepth
        result={result}
        onExploreQuestion={onConceptSelect}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <KeyTakeaways items={result.keyTakeaways} />
        <ConceptMap
          topic={result.query}
          concepts={result.relatedConcepts}
          onSelect={onConceptSelect}
        />
      </div>

      {result.sources.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h2 className="font-semibold">
              {result.source === "gemini" ? "Suggested reading" : "Sources"}
            </h2>
            <span className="text-sm text-muted-foreground">
              ({result.sources.length})
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.sources.map((source, i) => (
              <SourceCard key={`${source.url}-${i}`} source={source} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
