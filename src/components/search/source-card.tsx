"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronDown, Clock, ExternalLink, Sparkles } from "lucide-react";

import type { SearchSource } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceCard({
  source,
  index,
}: {
  source: SearchSource;
  index: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const domain = domainOf(source.url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="flex flex-col rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent">
          {source.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={source.favicon}
              alt=""
              className="size-5"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Sparkles className="size-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-1 font-medium leading-snug hover:text-primary"
          >
            <span className="line-clamp-2">{source.title}</span>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-normal">
              {source.suggested ? "Suggested" : domain}
            </Badge>
            {source.readingTimeMins ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {source.readingTimeMins} min read
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {source.summary && (
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed text-muted-foreground",
            !expanded && "line-clamp-3"
          )}
        >
          {source.summary}
        </p>
      )}

      {expanded && source.highlights.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-l-2 border-primary/30 pl-3">
          {source.highlights.map((h, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              &ldquo;{h}&rdquo;
            </li>
          ))}
        </ul>
      )}

      {(source.summary.length > 180 || source.highlights.length > 0) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      )}
    </motion.div>
  );
}
