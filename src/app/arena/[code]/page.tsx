import type { Metadata } from "next";

import { ArenaMatch } from "@/components/arena/arena-match";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Duel",
  description: "Take on a StoryQuest Arena knowledge duel.",
};

export default async function ArenaMatchPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <ArenaMatch code={code.toUpperCase()} />
    </div>
  );
}
