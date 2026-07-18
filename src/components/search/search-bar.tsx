"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SearchBar({
  value,
  onChange,
  onSearch,
  loading = false,
  autoFocus = false,
  rightSlot,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  loading?: boolean;
  autoFocus?: boolean;
  /** Slot for the voice-input mic button. */
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) onSearch(q);
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "glow-brand flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 backdrop-blur",
        className
      )}
    >
      <Search className="ml-2 size-5 shrink-0 text-muted-foreground" />
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask anything… e.g. How do black holes bend time?"
        className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base outline-none placeholder:text-muted-foreground"
        aria-label="Search topic"
      />
      {rightSlot}
      <Button
        type="submit"
        className="shrink-0 rounded-xl"
        disabled={loading || !value.trim()}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4" />
        )}
        <span className="hidden sm:inline">Search</span>
      </Button>
    </form>
  );
}
