"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import {
  extractStructuredData,
  isAnyAiConfigured,
  NoAiProviderConfiguredError,
} from "@/lib/ai-extraction";
import { detectCountry, searchJobs, toDiscoveredJob } from "@/lib/adzuna";
import { isFirecrawlConfigured, isUaeLocation, searchFirecrawlJobs } from "@/lib/firecrawl";
import { DiscoveredJob } from "@/lib/job-discovery/types";
import {
  JOB_MATCH_JSON_SCHEMA,
  JOB_MATCH_SYSTEM_PROMPT,
  JobMatchResult,
} from "@/lib/job-match-schema";
import { Profile } from "@/lib/profile-types";
import { MATCH_THRESHOLD } from "@/lib/utils";

export type FindJobsResult = {
  success: boolean;
  jobsFound?: number;
  strongMatches?: number;
  message?: string;
  error?: string;
};

// Writes one row to agent_logs. Never throws — a logging failure should
// never take down the caller's actual error handling. Per code-standards.md:
// "Agent errors go to agent_logs table — never surface raw agent errors to
// the UI."
async function logAgentError(
  insforge: Awaited<ReturnType<typeof createInsforgeServer>>,
  runId: string,
  userId: string,
  message: string,
  jobId?: string
): Promise<void> {
  try {
    await insforge.database.from("agent_logs").insert([
      {
        run_id: runId,
        user_id: userId,
        level: "error",
        message,
        job_id: jobId ?? null,
      },
    ]);
  } catch (logError) {
    console.error("[actions/jobs:logAgentError] failed to write agent_logs row:", logError);
  }
}

// POST-equivalent business logic behind app/api/agent/find/route.ts.
// Called directly from components/find-jobs/SearchControls.tsx as a Server
// Action — the route handler exists only for spec parity / non-UI callers,
// per the architecture session's decision.
export async function findJobs(jobTitle: string, location: string): Promise<FindJobsResult> {
  const trimmedTitle = jobTitle?.trim();
  if (!trimmedTitle) {
    return { success: false, error: "Enter a job title to search for." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }
  const userId: string = user.id;

  if (!isAnyAiConfigured()) {
    return {
      success: false,
      error: "AI matching is not configured yet. Please try again later.",
    };
  }

  const insforge = await createInsforgeServer();

  const { data: profileRows } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", userId);
  const profile = (profileRows?.[0] as Profile) || null;

  // A profile row can exist with no real data (e.g. auto-created on resume
  // upload before the form is ever filled in) — is_complete is the same
  // flag actions/profile.ts maintains, so this catches that case instead
  // of silently scoring every job against an empty profile.
  if (!profile || !profile.is_complete) {
    return { success: false, error: "Complete your profile before searching for jobs." };
  }

  const trimmedLocation = location?.trim() || "";
  const country = detectCountry(trimmedLocation);

  const { data: runRows, error: runInsertError } = await insforge.database
    .from("agent_runs")
    .insert([
      {
        user_id: userId,
        status: "running",
        job_title_searched: trimmedTitle,
        location_searched: trimmedLocation || null,
      },
    ])
    .select()
    .single();

  if (runInsertError || !runRows) {
    console.error("[actions/jobs:findJobs] agent_runs insert error:", runInsertError);
    return { success: false, error: "Failed to start job search. Please try again." };
  }

  const runId = (runRows as { id: string }).id;

  const posthog = createPostHogServer();
  try {
    posthog.capture({
      distinctId: userId,
      event: "job_search_started",
      properties: { userId, jobTitle: trimmedTitle, location: trimmedLocation },
    });

    let discoveredJobs: DiscoveredJob[] = [];

    if (isUaeLocation(trimmedLocation) && isFirecrawlConfigured()) {
      try {
        discoveredJobs = await searchFirecrawlJobs(trimmedTitle, trimmedLocation);
      } catch (firecrawlError) {
        console.error("[actions/jobs:findJobs] Firecrawl search error:", firecrawlError);
        await logAgentError(
          insforge,
          runId,
          userId,
          firecrawlError instanceof Error ? firecrawlError.message : "Firecrawl search failed"
        );
      }
    } else {
      try {
        const adzunaResults = await searchJobs(trimmedTitle, trimmedLocation, country);
        discoveredJobs = adzunaResults.map((j) => toDiscoveredJob(j, country));
      } catch (adzunaError) {
        console.error("[actions/jobs:findJobs] Adzuna search error:", adzunaError);
        await logAgentError(
          insforge,
          runId,
          userId,
          adzunaError instanceof Error ? adzunaError.message : "Adzuna search failed"
        );
      }

      // If Adzuna returned 0 results and Firecrawl is configured, use Firecrawl web discovery as fallback
      if (discoveredJobs.length === 0 && isFirecrawlConfigured()) {
        try {
          discoveredJobs = await searchFirecrawlJobs(trimmedTitle, trimmedLocation);
        } catch (firecrawlError) {
          console.warn("[actions/jobs:findJobs] Firecrawl fallback search error:", firecrawlError);
        }
      }
    }

    if (discoveredJobs.length === 0) {
      await insforge.database
        .from("agent_runs")
        .update({
          status: "completed",
          jobs_found: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      revalidatePath("/find-jobs");

      return {
        success: true,
        jobsFound: 0,
        strongMatches: 0,
        message: `No jobs found matching "${trimmedTitle}" in "${trimmedLocation || "all locations"}". Try broadening your search terms.`,
      };
    }

    // Scores and saves one discovered job result. Runs concurrently across all
    // results (see Promise.allSettled below) to bound total time to roughly the
    // slowest single job instead of the sum of all of them.
    async function scoreAndSaveJob(job: DiscoveredJob): Promise<{ matchScore: number } | null> {
      try {
        const matchInput = JSON.stringify({
          job: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
          },
          candidateProfile: {
            currentTitle: profile.current_title,
            yearsExperience: profile.years_experience,
            experienceLevel: profile.experience_level,
            skills: profile.skills,
            industries: profile.industries,
            workExperience: profile.work_experience,
          },
        });

        const match = await extractStructuredData<JobMatchResult>(
          matchInput,
          JOB_MATCH_JSON_SCHEMA,
          JOB_MATCH_SYSTEM_PROMPT
        );

        const { error: jobInsertError } = await insforge.database.from("jobs").insert([
          {
            user_id: userId,
            run_id: runId,
            source: "search",
            source_url: job.redirect_url,
            external_apply_url: job.redirect_url,
            title: job.title,
            company: job.company,
            location: job.location,
            salary: job.salary,
            job_type: job.job_type || "fulltime",
            about_role: job.description,
            match_score: match.matchScore,
            match_reason: match.matchReason,
            matched_skills: match.matchedSkills,
            missing_skills: match.missingSkills,
            found_at: new Date().toISOString(),
            posted_at: job.posted_at || null,
          },
        ]);

        if (jobInsertError) {
          console.error("[actions/jobs:findJobs] jobs insert error:", jobInsertError);
          await logAgentError(
            insforge,
            runId,
            userId,
            jobInsertError.message || "Failed to save job"
          );
          return null;
        }

        posthog.capture({
          distinctId: userId,
          event: "job_found",
          properties: { userId, source: "search", matchScore: match.matchScore },
        });

        return { matchScore: match.matchScore };
      } catch (perJobError) {
        // One bad job (scoring failure, malformed AI response, etc.) never
        // aborts the whole batch — log it and let this job's slot resolve
        // to null.
        console.error("[actions/jobs:findJobs] per-job error:", perJobError);
        await logAgentError(
          insforge,
          runId,
          userId,
          perJobError instanceof Error ? perJobError.message : "Failed to score job"
        );
        return null;
      }
    }

    const settled = await Promise.allSettled(discoveredJobs.map(scoreAndSaveJob));

    let jobsSaved = 0;
    let strongMatches = 0;
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        jobsSaved += 1;
        if (result.value.matchScore >= MATCH_THRESHOLD) {
          strongMatches += 1;
        }
      }
    }

    await insforge.database
      .from("agent_runs")
      .update({
        status: "completed",
        jobs_found: jobsSaved,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    revalidatePath("/find-jobs");

    return {
      success: true,
      jobsFound: jobsSaved,
      strongMatches,
      message: `Found ${jobsSaved} job${jobsSaved === 1 ? "" : "s"} and saved ${strongMatches} strong match${strongMatches === 1 ? "" : "es"}.`,
    };
  } catch (error) {
    console.error("[actions/jobs:findJobs] Unexpected error:", error);
    if (error instanceof NoAiProviderConfiguredError) {
      return {
        success: false,
        error: "AI matching is not configured yet. Please try again later.",
      };
    }
    await insforge.database
      .from("agent_runs")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", runId);
    return { success: false, error: "Something went wrong while searching for jobs." };
  } finally {
    await posthog.shutdown();
  }
}
