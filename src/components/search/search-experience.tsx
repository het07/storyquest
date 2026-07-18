"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { SearchResult } from "@/types";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { CategoryBrowser } from "@/components/search/category-browser";

export function SearchExperience({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState(initialQuery);
  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const runSearch = React.useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

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

        if (res.headers.get("x-search-fallback") === "1") {
          toast.info("Using AI fallback", {
            description: "Exa was busy, so results came from the AI fallback.",
          });
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

  // Run once on mount if we arrived with a ?topic= query.
  const ranInitial = React.useRef(false);
  React.useEffect(() => {
    if (!ranInitial.current && initialQuery.trim()) {
      ranInitial.current = true;
      runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  return (
    <div className="space-y-8">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={runSearch}
        loading={loading}
        autoFocus={!initialQuery}
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
