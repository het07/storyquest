import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5">
      <div
        className={cn(
          "mb-3 grid size-10 place-items-center rounded-xl",
          accent ? "bg-brand-gradient text-white" : "bg-accent text-primary"
        )}
      >
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
