"use client";

import * as React from "react";
import { Swords } from "lucide-react";

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
import { ChallengeForm } from "@/components/arena/challenge-form";

export function ChallengeButton({
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
          <Button size="sm" variant="outline" className="gap-2 rounded-full">
            <Swords className="size-4" />
            Challenge a friend
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Challenge on {topic}</DialogTitle>
          <DialogDescription>
            Everyone with the link takes the same questions. Fastest, most accurate climbs
            the leaderboard.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ChallengeForm topic={topic} context={context} defaultDifficulty={difficulty} />
        )}
      </DialogContent>
    </Dialog>
  );
}
