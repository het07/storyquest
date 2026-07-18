import type { Metadata } from "next";

import { SearchExperience } from "@/components/search/search-experience";
import { HandsFreeStart } from "@/components/voice/hands-free-start";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Search any topic and get a clear, visual breakdown — a TL;DR, key takeaways, and a map of related concepts. Fully usable hands-free with voice.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          What do you want to <span className="text-gradient">understand</span>?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Get a clear, visual breakdown of any topic in seconds — or go fully hands-free.
        </p>
      </div>
      <div id="hands-free" className="mb-6 scroll-mt-24">
        <HandsFreeStart />
      </div>
      <SearchExperience initialQuery={topic ?? ""} />
    </div>
  );
}
