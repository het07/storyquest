import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white">
        <LayoutDashboard className="size-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Your dashboard is coming soon
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Track your learning streaks, XP, and quiz progress here once the
        personalization phase is complete.
      </p>
    </div>
  );
}
