"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

import type { Difficulty } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  intermediate:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced:
    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function TldrCard({
  tldr,
  difficulty,
  actions,
}: {
  tldr: string;
  difficulty: Difficulty;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glow-brand relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-fuchsia-500/[0.05] p-6"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="size-4" />
          TL;DR
        </div>
        <Badge
          variant="outline"
          className={cn("capitalize", DIFFICULTY_STYLES[difficulty])}
        >
          {difficulty}
        </Badge>
      </div>
      <p className="relative mt-3 text-pretty text-lg leading-relaxed">{tldr}</p>
      {actions && <div className="relative mt-4 flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  );
}
