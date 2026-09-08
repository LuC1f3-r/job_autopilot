export type DailyJobs = {
  day: string;
  jobs: number;
};

export type ScoreBucket = {
  bucket: string;
  count: number;
};

export type DailyCount = {
  day: string;
  count: number;
};

export type DashboardAnalytics = {
  jobsOverTime: DailyJobs[];
  matchScoreDistribution: ScoreBucket[];
  companyResearchActivity: DailyCount[];
  source: "posthog" | "database";
};

export type AnalyticsJobRecord = {
  id?: string;
  match_score: number | null;
  found_at: string;
  company_research?: unknown | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DISPLAY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Aggregates jobs found over the last 7 days grouped by weekday.
 */
export function aggregateJobsOverTime(
  jobs: AnalyticsJobRecord[],
  now: number = Date.now(),
): DailyJobs[] {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoff = now - SEVEN_DAYS_MS;

  const counts: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  for (const job of jobs) {
    if (!job.found_at) continue;
    const time = new Date(job.found_at).getTime();
    if (Number.isNaN(time) || time < cutoff) continue;

    const dayName = WEEKDAYS[new Date(time).getDay()];
    if (dayName && dayName in counts) {
      counts[dayName] = (counts[dayName] || 0) + 1;
    }
  }

  return DISPLAY_DAYS.map((day) => ({
    day,
    jobs: counts[day] || 0,
  }));
}

/**
 * Groups match scores into 5 discrete percentage ranges.
 */
export function aggregateMatchScores(jobs: AnalyticsJobRecord[]): ScoreBucket[] {
  const buckets: Record<string, number> = {
    "50-60%": 0,
    "60-70%": 0,
    "70-80%": 0,
    "80-90%": 0,
    "90-100%": 0,
  };

  for (const job of jobs) {
    if (typeof job.match_score !== "number" || Number.isNaN(job.match_score)) {
      continue;
    }

    const score = job.match_score;
    if (score >= 90) {
      buckets["90-100%"] += 1;
    } else if (score >= 80) {
      buckets["80-90%"] += 1;
    } else if (score >= 70) {
      buckets["70-80%"] += 1;
    } else if (score >= 60) {
      buckets["60-70%"] += 1;
    } else {
      buckets["50-60%"] += 1;
    }
  }

  return [
    { bucket: "50-60%", count: buckets["50-60%"] },
    { bucket: "60-70%", count: buckets["60-70%"] },
    { bucket: "70-80%", count: buckets["70-80%"] },
    { bucket: "80-90%", count: buckets["80-90%"] },
    { bucket: "90-100%", count: buckets["90-100%"] },
  ];
}

/**
 * Aggregates company research activity over the last 7 days grouped by weekday.
 */
export function aggregateCompanyResearch(
  jobs: AnalyticsJobRecord[],
  now: number = Date.now(),
): DailyCount[] {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoff = now - SEVEN_DAYS_MS;

  const counts: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  for (const job of jobs) {
    if (!job.company_research || !job.found_at) continue;
    const time = new Date(job.found_at).getTime();
    if (Number.isNaN(time) || time < cutoff) continue;

    const dayName = WEEKDAYS[new Date(time).getDay()];
    if (dayName && dayName in counts) {
      counts[dayName] = (counts[dayName] || 0) + 1;
    }
  }

  return DISPLAY_DAYS.map((day) => ({
    day,
    count: counts[day] || 0,
  }));
}

/**
 * Computes dashboard analytics from local database job records.
 */
export function calculateDbAnalytics(
  jobs: AnalyticsJobRecord[],
  now: number = Date.now(),
): DashboardAnalytics {
  return {
    jobsOverTime: aggregateJobsOverTime(jobs, now),
    matchScoreDistribution: aggregateMatchScores(jobs),
    companyResearchActivity: aggregateCompanyResearch(jobs, now),
    source: "database",
  };
}

type PostHogEventResponse = {
  results?: Array<{
    id: string;
    event: string;
    properties?: Record<string, unknown>;
    timestamp: string;
    distinct_id: string;
  }>;
};

/**
 * Queries PostHog's Events API for the user's events if read credentials are configured.
 */
export async function fetchPostHogAnalytics(
  userId: string,
  now: number = Date.now(),
): Promise<DashboardAnalytics | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  if (!apiKey || !projectId) {
    return null;
  }

  try {
    const url = `${host.replace(/\/$/, "")}/api/projects/${projectId}/events/?distinct_id=${encodeURIComponent(userId)}&limit=500`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(
        `[dashboard-analytics] PostHog query error: HTTP ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as PostHogEventResponse;
    const events = data.results || [];

    const jobRecords: AnalyticsJobRecord[] = [];
    for (const ev of events) {
      if (ev.event === "job_found") {
        const score = typeof ev.properties?.matchScore === "number" ? ev.properties.matchScore : null;
        jobRecords.push({
          match_score: score,
          found_at: ev.timestamp,
        });
      } else if (ev.event === "company_researched") {
        jobRecords.push({
          match_score: null,
          found_at: ev.timestamp,
          company_research: true,
        });
      }
    }

    return {
      jobsOverTime: aggregateJobsOverTime(jobRecords, now),
      matchScoreDistribution: aggregateMatchScores(jobRecords),
      companyResearchActivity: aggregateCompanyResearch(jobRecords, now),
      source: "posthog",
    };
  } catch (error) {
    console.error("[dashboard-analytics] Failed to fetch PostHog analytics:", error);
    return null;
  }
}

/**
 * Unified getter: Attempts to source from PostHog API first; falls back
 * gracefully to InsForge DB records.
 */
export async function getDashboardAnalytics(
  userId: string | undefined,
  jobs: AnalyticsJobRecord[],
  now: number = Date.now(),
): Promise<DashboardAnalytics> {
  if (userId) {
    const posthogData = await fetchPostHogAnalytics(userId, now);
    if (posthogData) {
      return posthogData;
    }
  }

  return calculateDbAnalytics(jobs, now);
}
