"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import type { ScoreBucket } from "@/lib/dashboard-analytics";

type Props = {
  data?: ScoreBucket[];
};

/** Green bar chart — distribution of job match scores. */
export function MatchScoreChart({ data = [] }: Props) {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  const isEmpty = totalCount === 0;
  const maxVal = Math.max(...data.map((d) => d.count), 0);
  const yDomainMax = Math.max(maxVal, 4);

  return (
    <ChartCard title="Match Score Distribution">
      <div className="h-64">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-text-secondary">No match scores available</p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Discover and score jobs to see your match distribution across score tiers.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border-light)" strokeDasharray="3 3" />
              <XAxis
                dataKey="bucket"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              />
              <YAxis
                domain={[0, yDomainMax]}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-surface-hover, rgba(0,0,0,0.03))" }}
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  fontSize: "0.875rem",
                }}
                itemStyle={{ color: "var(--color-success-alt)" }}
                labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 500 }}
              />
              <Bar
                dataKey="count"
                fill="var(--color-success-alt)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
