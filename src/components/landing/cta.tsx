"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-brand-gradient px-6 py-16 text-center text-white sm:px-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Your next favorite subject is one question away
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-white/80">
          Start as a guest — no account, no friction. Save your streak whenever
          you&apos;re ready.
        </p>
        <div className="relative mt-8 flex justify-center">
          <Link
            href="/explore"
            className={cn(
              buttonVariants({ size: "lg", variant: "secondary" }),
              "group rounded-full px-8 text-base"
            )}
          >
            Begin your quest
            <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
