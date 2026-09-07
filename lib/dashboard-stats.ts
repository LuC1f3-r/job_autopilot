export type DashboardJob = {
  id: string;
  company: string | null;
  match_score: number | null;
  found_at: string;
  company_research: unknown | null;
};

export type DashboardStats = {
  totalJobsCount: number;
  totalJobsDelta?: string;
  totalJobsCaption: string;
  avgMatchScore: number;
  matchRateDelta?: string;
  matchRateCaption: string;
  companiesResearchedCount: number;
  jobsThisWeekCount: number;
};

/**
 * Pure calculation helper for dashboard stat cards.
 * Computes counts, averages, and week-over-week deltas from real user jobs.
 */
export function calculateDashboardStats(
  jobs: DashboardJob[],
  now: number = Date.now(),
): DashboardStats {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - SEVEN_DAYS_MS;
  const fourteenDaysAgo = now - 2 * SEVEN_DAYS_MS;

  const jobsThisWeek = jobs.filter(
    (j) => new Date(j.found_at).getTime() >= sevenDaysAgo,
  );
  const jobsPriorWeek = jobs.filter((j) => {
    const t = new Date(j.found_at).getTime();
    return t >= fourteenDaysAgo && t < sevenDaysAgo;
  });

  // Total Jobs Found + trend indicator
  const totalJobsCount = jobs.length;
  let totalJobsDelta: string | undefined;
  let totalJobsCaption = "vs last week";

  if (jobsPriorWeek.length > 0) {
    const pct = Math.round(
      ((jobsThisWeek.length - jobsPriorWeek.length) / jobsPriorWeek.length) * 100,
    );
    totalJobsDelta = `${pct >= 0 ? "+" : ""}${pct}%`;
  } else if (jobsThisWeek.length > 0) {
    totalJobsDelta = "+100%";
  } else {
    totalJobsCaption = "All time";
  }

  // Avg. Match Rate + trend indicator
  const scoredJobs = jobs.filter(
    (j) => typeof j.match_score === "number" && !Number.isNaN(j.match_score),
  );
  const avgMatchScore =
    scoredJobs.length > 0
      ? Math.round(
          scoredJobs.reduce((sum, j) => sum + (j.match_score ?? 0), 0) /
            scoredJobs.length,
        )
      : 0;

  const scoredThisWeek = jobsThisWeek.filter(
    (j) => typeof j.match_score === "number" && !Number.isNaN(j.match_score),
  );
  const scoredPriorWeek = jobsPriorWeek.filter(
    (j) => typeof j.match_score === "number" && !Number.isNaN(j.match_score),
  );

  let matchRateDelta: string | undefined;
  let matchRateCaption = "vs last week";

  if (scoredThisWeek.length > 0 && scoredPriorWeek.length > 0) {
    const avgThis = Math.round(
      scoredThisWeek.reduce((sum, j) => sum + (j.match_score ?? 0), 0) /
        scoredThisWeek.length,
    );
    const avgPrior = Math.round(
      scoredPriorWeek.reduce((sum, j) => sum + (j.match_score ?? 0), 0) /
        scoredPriorWeek.length,
    );
    const diff = avgThis - avgPrior;
    matchRateDelta = `${diff >= 0 ? "+" : ""}${diff}%`;
  } else if (scoredJobs.length > 0) {
    matchRateCaption = "All time average";
  } else {
    matchRateCaption = "No scores yet";
  }

  // Companies Researched (distinct researched companies)
  const researchedJobs = jobs.filter(
    (j) => j.company_research !== null && j.company_research !== undefined,
  );
  const distinctResearched = new Set(
    researchedJobs
      .map((j) => j.company?.trim().toLowerCase())
      .filter(Boolean),
  );
  const companiesResearchedCount =
    distinctResearched.size || researchedJobs.length;

  // Jobs This Week
  const jobsThisWeekCount = jobsThisWeek.length;

  return {
    totalJobsCount,
    totalJobsDelta,
    totalJobsCaption,
    avgMatchScore,
    matchRateDelta,
    matchRateCaption,
    companiesResearchedCount,
    jobsThisWeekCount,
  };
}
