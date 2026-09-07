"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";

const MOCK_DATA = [
  { bucket: "50-60%", count: 3 },
  { bucket: "60-70%", count: 12 },
  { bucket: "70-80%", count: 42 },
  { bucket: "80-90%", count: 85 },
  { bucket: "90-100%", count: 33 },
];

/** Green bar chart — distribution of job match scores. Mock data for now. */
export function MatchScoreChart() {
  return (
    <ChartCard title="Match Score Distribution">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MOCK_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border-light)" strokeDasharray="3 3" />
            <XAxis
              dataKey="bucket"
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
            <Bar dataKey="count" fill="var(--color-success-alt)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
