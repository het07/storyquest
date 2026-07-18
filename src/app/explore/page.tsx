import { Compass } from "lucide-react";

export default function ExplorePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white">
        <Compass className="size-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Explore is on the way
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Search and visual results land in an upcoming phase. Soon you&apos;ll be
        able to look up any topic and get a clear, visual breakdown here.
      </p>
    </div>
  );
}
