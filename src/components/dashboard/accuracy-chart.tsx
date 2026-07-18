"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AttemptPoint } from "@/lib/stats";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AccuracyTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as AttemptPoint;
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
      <div style={{ color: "var(--foreground)", fontWeight: 600 }}>{p.topic}</div>
      <div>
        {p.accuracy}% ({p.score}/{p.total})
      </div>
    </div>
  );
}

export function AccuracyChart({ data }: { data: AttemptPoint[] }) {
  const points = data.map((d, i) => ({ ...d, n: `#${i + 1}` }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="n"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip cursor={{ stroke: "var(--border)" }} content={<AccuracyTooltip />} />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="#7c3aed"
          strokeWidth={2}
          dot={{ r: 3, fill: "#7c3aed" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
