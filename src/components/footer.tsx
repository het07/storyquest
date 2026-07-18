import Link from "next/link";
import { Compass } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-gradient text-white">
            <Compass className="size-4" />
          </span>
          <span className="text-sm font-semibold">
            StoryQuest <span className="text-gradient">Arena</span>
          </span>
        </Link>
        <p className="text-xs text-muted-foreground">
          Learn anything. Speak it. Master it.
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} StoryQuest Arena
        </p>
      </div>
    </footer>
  );
}
