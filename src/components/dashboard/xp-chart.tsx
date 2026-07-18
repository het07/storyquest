"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyXp } from "@/lib/stats";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function XpTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        fontSize: 12,
        color: "var(--popover-foreground)",
        padding: "8px 10px",
      }}
    >
      <div style={{ color: "var(--foreground)", fontWeight: 600 }}>{label}</div>
      <div>{payload[0].value} XP earned</div>
    </div>
  );
}

export function XpChart({ data }: { data: DailyXp[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip cursor={{ stroke: "var(--border)" }} content={<XpTooltip />} />
        <Area
          type="monotone"
          dataKey="xp"
          stroke="#7c3aed"
          strokeWidth={2}
          fill="url(#xpFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
