"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  CURATED_TOPICS,
  type CuratedTopic,
} from "@/lib/topics-data";
import { CategoryIcon } from "@/components/category-icon";

const FILTERS = ["All", ...CATEGORIES] as const;

export function CategoryBrowser({
  onPick,
}: {
  onPick: (topic: string) => void;
}) {
  const [active, setActive] = React.useState<(typeof FILTERS)[number]>("All");

  const topics: CuratedTopic[] = React.useMemo(
    () =>
      active === "All"
        ? CURATED_TOPICS
        : CURATED_TOPICS.filter((t) => t.category === active),
    [active]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {FILTERS.map((filter) => {
          const isActive = filter === active;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActive(filter)}
              className={cn(
                "relative rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-transparent text-white"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="category-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-brand-gradient"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              {filter}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, i) => (
          <motion.button
            key={topic.name}
            type="button"
            onClick={() => onPick(topic.name)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
            className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
              <CategoryIcon category={topic.category} className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{topic.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {topic.description}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
