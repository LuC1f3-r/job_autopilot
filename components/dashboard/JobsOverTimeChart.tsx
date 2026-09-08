"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import type { DailyJobs } from "@/lib/dashboard-analytics";

type Props = {
  data?: DailyJobs[];
};

/** Purple area/line chart — jobs found across the week. */
export function JobsOverTimeChart({ data = [] }: Props) {
  const totalJobs = data.reduce((sum, item) => sum + item.jobs, 0);
  const isEmpty = totalJobs === 0;
  const maxVal = Math.max(...data.map((d) => d.jobs), 0);
  const yDomainMax = Math.max(maxVal, 4);

  return (
    <ChartCard title="Jobs Found Over Time">
      <div className="h-64">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-text-secondary">No jobs found this week</p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Use the Find Jobs search to discover opportunities and see your trend here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="jobsOverTimeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border-light)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
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
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  fontSize: "0.875rem",
                }}
                itemStyle={{ color: "var(--color-accent)" }}
                labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 500 }}
              />
              <Area
                type="monotone"
                dataKey="jobs"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#jobsOverTimeFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
