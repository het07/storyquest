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
            Answer the questions to check your understanding and earn XP.
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
