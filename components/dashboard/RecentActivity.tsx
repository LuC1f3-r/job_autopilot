import type { ActivityItem } from "@/lib/dashboard-activity";

type Props = {
  activities?: ActivityItem[];
};

/**
 * Feature 16 — Recent Activity feed wired to real DB data:
 * - agent_run completed: "Found X jobs for [jobTitle]" with green dot
 * - company_research: "Researched [company]" with blue info dot
 * - Reverse-chronological order, relative timestamps, empty state when no activity.
 */
export function RecentActivity({ activities = [] }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-base font-semibold text-text-primary">Recent Activity</h3>
      {activities.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-text-secondary">No recent activity</p>
          <p className="mt-1 max-w-xs text-xs text-text-muted">
            Run a job search or research a company to see your activity timeline here.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-border-light">
          {activities.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-4">
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotColor}`} />
              <div>
                <p className="text-sm font-medium text-text-primary">{item.text}</p>
                <p className="text-xs text-text-muted">{item.timestamp}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
