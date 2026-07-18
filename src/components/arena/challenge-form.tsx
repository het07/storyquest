"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Copy, Loader2, Play, Swords } from "lucide-react";

import type { Difficulty } from "@/types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DIFFICULTIES: { label: string; value: Difficulty }[] = [
  { label: "beginner", value: "beginner" },
  { label: "intermediate", value: "intermediate" },
  { label: "advanced", value: "advanced" },
];
const LENGTHS = [
  { label: "3", value: 3 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
];
const TIMES = [
  { label: "1 min", value: 60 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
];

interface Created {
  code: string;
  topic: string;
  difficulty: Difficulty;
  numQuestions: number;
  timeLimitSec: number;
}

type SegOption = { label: string; value: string | number };

function Segmented({
  options,
  value,
  onChange,
}: {
  options: SegOption[];
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((item) => (
        <button
          key={String(item.value)}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
            value === item.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ChallengeForm({
  topic: fixedTopic,
  context,
  defaultDifficulty = "intermediate",
  onCreated,
}: {
  topic?: string;
  context?: string;
  defaultDifficulty?: Difficulty;
  onCreated?: (code: string) => void;
}) {
  const [topic, setTopic] = React.useState(fixedTopic ?? "");
  const [difficulty, setDifficulty] = React.useState<Difficulty>(defaultDifficulty);
  const [numQuestions, setNumQuestions] = React.useState(5);
  const [timeLimitSec, setTimeLimitSec] = React.useState(180);
  const [loading, setLoading] = React.useState(false);
  const [created, setCreated] = React.useState<Created | null>(null);
  const [copied, setCopied] = React.useState(false);

  const shareUrl = created
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/arena/${created.code}`
    : "";

  const create = async () => {
    const t = (fixedTopic ?? topic).trim();
    if (!t) {
      toast.error("Enter a topic to duel on.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/arena/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, context, difficulty, numQuestions, timeLimitSec }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't create the duel.");
      setCreated(data as Created);
      onCreated?.(data.code);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied — send it to a friend!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Copy the link manually.");
    }
  };

  if (created) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">Challenge ready</p>
          <p className="mt-0.5 text-lg font-semibold">{created.topic}</p>
          <p className="text-xs text-muted-foreground">
            {created.numQuestions} questions · {Math.round(created.timeLimitSec / 60)} min ·{" "}
            <span className="capitalize">{created.difficulty}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="share-url">Share this link</Label>
          <div className="flex gap-2">
            <Input id="share-url" readOnly value={shareUrl} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy link">
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Play your round now — anyone who opens the link takes the same questions and joins
            the leaderboard.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/arena/${created.code}`}
            className={cn(buttonVariants(), "flex-1 gap-2")}
          >
            <Play className="size-4" />
            Play your round
          </Link>
          <Button variant="outline" onClick={() => setCreated(null)}>
            New challenge
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!fixedTopic && (
        <div className="space-y-1.5">
          <Label htmlFor="duel-topic">Topic</Label>
          <Input
            id="duel-topic"
            placeholder="e.g. Black holes, React hooks, Photosynthesis"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Difficulty</Label>
        <Segmented
          options={DIFFICULTIES}
          value={difficulty}
          onChange={(v) => setDifficulty(v as Difficulty)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Questions</Label>
        <Segmented
          options={LENGTHS}
          value={numQuestions}
          onChange={(v) => setNumQuestions(Number(v))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Time limit</Label>
        <Segmented
          options={TIMES}
          value={timeLimitSec}
          onChange={(v) => setTimeLimitSec(Number(v))}
        />
      </div>

      <Button onClick={create} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Swords className="size-4" />}
        {loading ? "Building challenge…" : "Create challenge"}
      </Button>
    </div>
  );
}
