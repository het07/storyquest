"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Mic, Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const SAMPLE_QUERIES = [
  "How do black holes bend time?",
  "The story behind the Renaissance",
  "What makes mRNA vaccines work?",
  "Explain quantum entanglement simply",
  "Why did the Roman Empire fall?",
];

function useTypewriter(words: string[], speed = 55, pause = 1400) {
  const [text, setText] = React.useState("");
  const [wordIndex, setWordIndex] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const current = words[wordIndex % words.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text === current) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && text === "") {
      setDeleting(false);
      setWordIndex((i) => i + 1);
    } else {
      timeout = setTimeout(
        () => {
          setText((prev) =>
            deleting
              ? current.slice(0, prev.length - 1)
              : current.slice(0, prev.length + 1)
          );
        },
        deleting ? speed / 2 : speed
      );
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, wordIndex, words, speed, pause]);

  return text;
}

export function Hero() {
  const typed = useTypewriter(SAMPLE_QUERIES);

  return (
    <section className="relative overflow-hidden">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="animate-aurora absolute -left-32 top-0 size-[38rem] rounded-full bg-primary/25 blur-[120px]" />
        <div className="animate-aurora absolute -right-24 top-24 size-[32rem] rounded-full bg-fuchsia-500/20 blur-[120px] [animation-delay:-6s]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur"
        >
          <Sparkles className="size-3.5 text-primary" />
          AI-curated learning, powered by voice
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl"
        >
          Learn anything. <span className="text-gradient">Speak it.</span>{" "}
          Master it.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground"
        >
          Search any topic and get a clear, visual breakdown you can actually
          understand — then test yourself with instant quizzes. No keyboard
          required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/explore"
            className={cn(
              buttonVariants({ size: "lg" }),
              "group rounded-full px-6"
            )}
          >
            Start exploring free
            <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/explore"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "rounded-full px-6"
            )}
          >
            No sign-up needed
          </Link>
        </motion.div>

        {/* Animated live-search preview */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mt-14 w-full max-w-2xl"
        >
          <div className="glow-brand rounded-2xl border border-border/60 bg-card/80 p-2 backdrop-blur">
            <div className="flex items-center gap-3 rounded-xl bg-background px-4 py-3.5 text-left">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-base text-foreground">
                {typed}
                <span className="ml-0.5 inline-block h-5 w-px animate-pulse bg-primary align-middle" />
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-gradient text-white">
                <Mic className="size-4" />
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Type it, or just say it out loud.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
