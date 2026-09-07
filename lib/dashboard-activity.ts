import { formatRelativeDate } from "@/lib/format-date";

export type AgentRunRow = {
  id: string;
  status: string;
  job_title_searched: string | null;
  jobs_found: number;
  completed_at: string | null;
  started_at: string;
};

export type ResearchedJobRow = {
  id: string;
  company: string | null;
  found_at: string;
  company_research: unknown | null;
};

export type ActivityItem = {
  id: string;
  dotColor: string;
  text: string;
  timestamp: string;
};

/**
 * Merges and formats completed agent runs and researched company jobs into
 * a unified, reverse-chronological activity feed for the dashboard.
 */
export function buildRecentActivities(
  runs: AgentRunRow[],
  researchedJobs: ResearchedJobRow[],
  limit = 5,
): ActivityItem[] {
  type RawActivity = {
    id: string;
    dotColor: string;
    text: string;
    dateIso: string;
    timestampMs: number;
  };

  const activities: RawActivity[] = [];

  for (const run of runs) {
    if (!run.job_title_searched || run.status !== "completed") continue;
    const dateIso = run.completed_at || run.started_at;
    const dateMs = new Date(dateIso).getTime();
    const count = run.jobs_found ?? 0;
    activities.push({
      id: `run-${run.id}`,
      dotColor: "bg-success",
      text: `Found ${count} job${count === 1 ? "" : "s"} for ${run.job_title_searched}`,
      dateIso,
      timestampMs: Number.isNaN(dateMs) ? 0 : dateMs,
    });
  }

  for (const job of researchedJobs) {
    if (!job.company_research) continue;
    const dateIso = job.found_at;
    const dateMs = new Date(dateIso).getTime();
    const company = job.company?.trim() || "company";
    activities.push({
      id: `research-${job.id}`,
      dotColor: "bg-info",
      text: `Researched ${company}`,
      dateIso,
      timestampMs: Number.isNaN(dateMs) ? 0 : dateMs,
    });
  }

  // Sort descending (newest first)
  activities.sort((a, b) => b.timestampMs - a.timestampMs);

  return activities.slice(0, limit).map((act) => ({
    id: act.id,
    dotColor: act.dotColor,
    text: act.text,
    timestamp: formatRelativeDate(act.dateIso),
  }));
}
