import Link from "next/link";
import { Compass } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white">
        <Compass className="size-7" />
      </div>
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
        This page wandered off the map
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist. Let&apos;s get you
        back to exploring.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Go home
        </Link>
        <Link href="/explore" className={cn(buttonVariants(), "rounded-full")}>
          Start exploring
        </Link>
      </div>
    </div>
  );
}
