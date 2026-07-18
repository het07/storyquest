"use client";

import { motion } from "motion/react";
import { BrainCircuit, Mic2, Sparkles, Trophy } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Curated Search",
    tagline: "Understand faster",
    description:
      "Every topic comes back as a clear TL;DR, key takeaways, and an interactive concept map — not a wall of blue links.",
  },
  {
    icon: Mic2,
    title: "Voice-First Learning",
    tagline: "Go hands-free",
    description:
      "Speak your questions and listen to answers read aloud in a natural voice. Learn while you walk, cook, or commute.",
  },
  {
    icon: Trophy,
    title: "Quiz Challenge",
    tagline: "Prove it",
    description:
      "Feeling confident? Generate an instant multiple-choice quiz on what you just learned and earn XP for every streak.",
  },
];

export function Features() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <BrainCircuit className="size-3.5 text-primary" />
          Built for how you actually learn
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Three ways to go from curious to confident
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-xl"
          >
            <div className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 md:opacity-0" />
            <div className="mb-5 inline-grid size-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-sm">
              <feature.icon className="size-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {feature.tagline}
            </p>
            <h3 className="mt-1 text-xl font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
