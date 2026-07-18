"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { TrendingUp } from "lucide-react";

import { CURATED_TOPICS } from "@/lib/topics-data";
import { CategoryIcon } from "@/components/category-icon";

interface TrendingTopic {
  name: string;
  category: string;
  description?: string;
  searchCount?: number;
}

const INITIAL: TrendingTopic[] = CURATED_TOPICS.slice(0, 8);

export function Trending() {
  const [topics, setTopics] = React.useState<TrendingTopic[]>(INITIAL);

  React.useEffect(() => {
    let active = true;
    fetch("/api/trending?limit=10")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.topics?.length) setTopics(data.topics);
      })
      .catch(() => {
        /* keep curated fallback */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="w-full py-20">
      <div className="mx-auto mb-8 flex max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5 text-primary" />
            Trending now
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Not sure where to start?
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Jump into a popular topic — or drag to browse what other explorers are
          learning right now.
        </p>
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="hidden shrink-0 sm:block sm:w-[max(0px,calc((100vw-72rem)/2))]" />
        {topics.map((topic, i) => (
          <motion.div
            key={topic.name}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
          >
            <Link
              href={`/explore?topic=${encodeURIComponent(topic.name)}`}
              className="group flex h-40 w-56 shrink-0 snap-start flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="inline-grid size-11 place-items-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                <CategoryIcon category={topic.category} className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {topic.category}
                </p>
                <p className="mt-1 font-semibold leading-tight">{topic.name}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
