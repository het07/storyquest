"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { SearchResult } from "@/types";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { CategoryBrowser } from "@/components/search/category-browser";
import { MicButton } from "@/components/voice/mic-button";
import { useVoiceMode, useVoiceCommands } from "@/components/voice/voice-mode-provider";

function buildNarration(result: SearchResult): string {
  const takeaways = result.keyTakeaways.length
    ? ` Key takeaways: ${result.keyTakeaways.join(". ")}.`
    : "";
  return `${result.tldr}${takeaways}`;
}

export function SearchExperience({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const router = useRouter();
  const voice = useVoiceMode();
  const [query, setQuery] = React.useState(initialQuery);
  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const lastSearchedRef = React.useRef("");
  const spokenForRef = React.useRef<string | null>(null);

  const runSearch = React.useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      lastSearchedRef.current = trimmed.toLowerCase();
      setLoading(true);
      setError(null);
      setQuery(trimmed);

      // Reflect the query in the URL (shareable, back-button friendly).
      router.replace(`/explore?topic=${encodeURIComponent(trimmed)}`, {
        scroll: false,
      });

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Search failed. Please try again.");
        }

        const data: SearchResult = await res.json();
        setResult(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message = (err as Error).message;
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // Run whenever we arrive with (or navigate to) a new ?topic= query. This also
  // lets a voice command like "explore black holes" trigger a search in place.
  React.useEffect(() => {
    const q = initialQuery.trim();
    if (q && q.toLowerCase() !== lastSearchedRef.current) {
      runSearch(q);
    }
  }, [initialQuery, runSearch]);

  // Read the summary aloud automatically when voice mode is on.
  React.useEffect(() => {
    if (!voice.enabled || !result) return;
    if (spokenForRef.current === result.query) return;
    spokenForRef.current = result.query;
    void voice.speak(buildNarration(result));
  }, [result, voice]);

  // Voice commands available while viewing search results.
  useVoiceCommands("search", [
    {
      pattern: /\b(read|read it|read summary|read again|listen|summary)\b/,
      description: "Read the current summary",
      run: () => {
        if (result) void voice.speak(buildNarration(result));
      },
    },
  ]);

  return (
    <div className="space-y-8">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={runSearch}
        loading={loading}
        autoFocus={!initialQuery}
        rightSlot={
          <MicButton
            onInterim={setQuery}
            onTranscript={(text) => {
              setQuery(text);
              runSearch(text);
            }}
            disabled={loading}
          />
        }
      />
      {result || loading || error ? (
        <SearchResults
          result={result}
          loading={loading}
          error={error}
          onConceptSelect={runSearch}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Or pick a topic to explore
          </p>
          <CategoryBrowser onPick={runSearch} />
        </div>
      )}
    </div>
  );
}
