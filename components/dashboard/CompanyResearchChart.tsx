"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";

const MOCK_DATA = [
  { day: "Mon", count: 2 },
  { day: "Tue", count: 5 },
  { day: "Wed", count: 3 },
  { day: "Thu", count: 8 },
  { day: "Fri", count: 12 },
  { day: "Sat", count: 4 },
  { day: "Sun", count: 1 },
];

/** Blue bar chart — companies researched per weekday. Mock data for now. */
export function CompanyResearchChart() {
  return (
    <ChartCard title="Company Research Activity">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MOCK_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border-light)" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            />
            <YAxis
              domain={[0, 12]}
              ticks={[0, 3, 6, 9, 12]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            />
            <Bar dataKey="count" fill="var(--color-info)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
