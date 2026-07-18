"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Atom,
  Landmark,
  Palette,
  Rocket,
  Cpu,
  HeartPulse,
  Brain,
  TrendingUp,
} from "lucide-react";

const TRENDING = [
  { name: "Quantum Computing", category: "Technology", icon: Cpu },
  { name: "The French Revolution", category: "History", icon: Landmark },
  { name: "Black Holes", category: "Space", icon: Rocket },
  { name: "How Vaccines Work", category: "Health", icon: HeartPulse },
  { name: "Impressionism", category: "Art", icon: Palette },
  { name: "Neural Networks", category: "Technology", icon: Brain },
  { name: "Photosynthesis", category: "Science", icon: Atom },
];

export function Trending() {
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

      <div className="scrollbar-none flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="hidden shrink-0 sm:block sm:w-[max(0px,calc((100vw-72rem)/2))]" />
        {TRENDING.map((topic, i) => (
          <motion.div
            key={topic.name}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              href={`/explore?topic=${encodeURIComponent(topic.name)}`}
              className="group flex h-40 w-56 shrink-0 snap-start flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="inline-grid size-11 place-items-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                <topic.icon className="size-5" />
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
