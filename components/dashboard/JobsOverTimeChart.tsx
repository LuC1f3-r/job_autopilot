"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";

const MOCK_DATA = [
  { day: "Mon", jobs: 8 },
  { day: "Tue", jobs: 45 },
  { day: "Wed", jobs: 32 },
  { day: "Thu", jobs: 55 },
  { day: "Fri", jobs: 88 },
  { day: "Sat", jobs: 48 },
  { day: "Sun", jobs: 12 },
];

/** Purple area/line chart — jobs found across the week. Mock data for now. */
export function JobsOverTimeChart() {
  return (
    <ChartCard title="Jobs Found Over Time">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
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
      </div>
    </ChartCard>
  );
}
