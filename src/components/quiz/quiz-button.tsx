"use client";

import * as React from "react";
import { GraduationCap } from "lucide-react";

import type { Difficulty } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { useVoiceCommands, useVoiceMode } from "@/components/voice/voice-mode-provider";

export function QuizButton({
  topic,
  context,
  difficulty,
}: {
  topic: string;
  context?: string;
  difficulty?: Difficulty;
}) {
  const [open, setOpen] = React.useState(false);
  const { enabled, speak } = useVoiceMode();

  // Hands-free: "test me" / "start quiz" opens the quiz without a click.
  useVoiceCommands("quiz-open", [
    {
      pattern: /\b(test me|start quiz|quiz me|take (a |the )?quiz|test myself)\b/,
      description: "Start a quiz on the current topic",
      run: () => {
        if (!enabled) return;
        setOpen(true);
        void speak(`Starting a quiz about ${topic}.`);
      },
    },
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2 rounded-full">
            <GraduationCap className="size-4" />
            Test yourself
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quiz: {topic}</DialogTitle>
          <DialogDescription>
            {enabled
              ? "Answer by saying A, B, C, or D. Say next for the next question."
              : "Answer the questions to check your understanding and earn XP."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <QuizRunner
            topic={topic}
            context={context}
            difficulty={difficulty}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
