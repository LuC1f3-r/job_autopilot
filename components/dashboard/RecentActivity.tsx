type ActivityItem = {
  id: string;
  dotColor: string;
  text: string;
  timestamp: string;
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", dotColor: "bg-accent", text: "Found 8 jobs for Frontend Engineer", timestamp: "10 mins ago" },
  { id: "2", dotColor: "bg-info", text: "Researched Stripe", timestamp: "1 hour ago" },
  { id: "3", dotColor: "bg-success", text: "Found 12 jobs for React Developer", timestamp: "2 hours ago" },
  { id: "4", dotColor: "bg-accent", text: "Researched Vercel", timestamp: "Yesterday" },
  { id: "5", dotColor: "bg-success", text: "Found 10 jobs for Full Stack Engineer", timestamp: "Yesterday" },
];

/**
 * Mock activity feed matching the dashboard design. Feature 16 will replace
 * MOCK_ACTIVITY with a real query over agent_runs / company_research.
 */
export function RecentActivity() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-base font-semibold text-text-primary">Recent Activity</h3>
      <ul className="mt-2 divide-y divide-border-light">
        {MOCK_ACTIVITY.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-4">
            <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotColor}`} />
            <div>
              <p className="text-sm font-medium text-text-primary">{item.text}</p>
              <p className="text-xs text-text-muted">{item.timestamp}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
