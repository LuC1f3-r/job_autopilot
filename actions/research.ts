"use server";

import { revalidatePath } from "next/cache";
// zod is pinned to the exact version Stagehand requires (see package.json)
// so npm dedupes to a single copy — Stagehand types extract() against its
// own zod instance, and two different installed versions produce
// structurally incompatible ZodType instances at the type level otherwise.
import { z } from "zod/v4";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import {
  isBrowserbaseConfigured,
  isStagehandModelConfigured,
  getStagehandModelConfig,
} from "@/lib/browserbase";
import { deriveHomepageUrl } from "@/lib/company-homepage";
import { extractStructuredData, isAnyAiConfigured } from "@/lib/ai-extraction";
import {
  COMPANY_RESEARCH_JSON_SCHEMA,
  COMPANY_RESEARCH_SYSTEM_PROMPT,
  CompanyResearchDossier,
} from "@/lib/company-research-schema";
import { Job } from "@/lib/job-types";
import { Profile } from "@/lib/profile-types";

export type ResearchCompanyResult = {
  success: boolean;
  dossier?: CompanyResearchDossier;
  error?: string;
};

// Same "never throw, log and return null" contract actions/jobs.ts's
// logAgentError uses — a logging failure never takes down the caller's
// actual error handling. agent_logs.run_id is NOT NULL in the schema, so
// every call site here always has a run row to point at, even though
// research is a single-job action, not a batch run like findJobs.
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
    console.error("[actions/research:logAgentError] failed to write agent_logs row:", logError);
  }
}

const HOMEPAGE_EXTRACT_SCHEMA = z.object({
  oneLiner: z.string().describe("What the company does in one sentence"),
  productSummary: z.string().describe("What they build/sell and who it's for"),
  signals: z
    .array(z.string())
    .describe("Funding, notable customers, scale, mission, recent news"),
  pageLinks: z
    .array(
      z.object({
        url: z
          .string()
          .describe(
            "The internal link web path or relative URL (e.g. '/about', '/product', '/careers'). Extract the actual href attribute or web path, NEVER an element ID or number like [2-2686]."
          ),
        kind: z.enum(["about", "careers", "blog", "engineering", "product", "team", "other"]),
      })
    )
    .describe("Internal links worth visiting"),
});

const SUBPAGE_EXTRACT_SCHEMA = z.object({
  keyPoints: z.array(z.string()),
  technologies: z
    .array(z.string())
    .describe("Specific languages, frameworks, tools, platforms"),
  valuesOrCulture: z.array(z.string()).describe("Stated values, working style, team norms"),
  notable: z.array(z.string()).describe("Customers, funding, scale, projects, awards"),
});

type HomepageResearch = z.infer<typeof HOMEPAGE_EXTRACT_SCHEMA>;
type SubPageResearch = z.infer<typeof SUBPAGE_EXTRACT_SCHEMA>;

// Sub-pages preferred in this order when more than 3 candidate links are
// found — about/blog/engineering/product tell a candidate more than a
// careers page does, per context/build-plan.md.
const SUBPAGE_KIND_PRIORITY = ["about", "engineering", "product", "blog", "team", "careers", "other"];
const MAX_SUBPAGES = 3;

function isValidSubPageUrl(url: string, homepageUrl: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  // Filter out element identifiers like [2-2686] or 2-2686
  if (/^\[?\d+-\d+\]?$/.test(trimmed)) return false;
  // Filter out anchors, mailto, javascript, tel
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed, homepageUrl);
    const homepage = new URL(homepageUrl);
    // Must be same origin (internal links only)
    if (parsed.origin !== homepage.origin) return false;
    // Must not be the homepage itself
    const p = parsed.pathname.replace(/\/+$/, "");
    const hp = homepage.pathname.replace(/\/+$/, "");
    if (p === hp) return false;
    return true;
  } catch {
    return false;
  }
}

function pickSubPageUrls(pageLinks: HomepageResearch["pageLinks"], homepageUrl: string): string[] {
  const sorted = [...pageLinks].sort(
    (a, b) => SUBPAGE_KIND_PRIORITY.indexOf(a.kind) - SUBPAGE_KIND_PRIORITY.indexOf(b.kind)
  );
  const seen = new Set<string>([homepageUrl]);
  const picked: string[] = [];
  for (const link of sorted) {
    if (picked.length >= MAX_SUBPAGES) break;
    if (!isValidSubPageUrl(link.url, homepageUrl)) continue;
    const resolved = new URL(link.url, homepageUrl).toString();
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    picked.push(resolved);
  }
  return picked;
}

// Runs the Stagehand browser research step: homepage extraction, then up to
// 3 sub-pages. Always closes the session, even on error. Returns null (not
// a throw) if the homepage looks like a wrong site/parked domain — callers
// proceed to synthesis with job + profile only, per build-plan.
async function runBrowserResearch(
  homepageUrl: string
): Promise<{ homepage: HomepageResearch; subPages: SubPageResearch[] } | null> {
  if (!isStagehandModelConfigured()) {
    // No OpenRouter key to power Stagehand's own act()/extract() calls —
    // skip browser research entirely and let synthesis proceed with job +
    // profile only, same as any other browser-research failure.
    return null;
  }

  const browser = await browserbase.launch({
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    api_timeout: 120,
  });

  try {
    const stagehand = await Stagehand.create({
      browser,
      model: getStagehandModelConfig(),
    });

    try {
      const [page] = await browser.context.pages();
      await page.goto(homepageUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });

      const { data: homepage } = await stagehand.extract(
        "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
        HOMEPAGE_EXTRACT_SCHEMA
      );

      if (!homepage.oneLiner && !homepage.productSummary) {
        return null;
      }

      const subPageUrls = pickSubPageUrls(homepage.pageLinks, homepageUrl);
      const subPages: SubPageResearch[] = [];

      for (const resolvedUrl of subPageUrls) {
        try {
          await page.goto(resolvedUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
          const { data: subPage } = await stagehand.extract(
            "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
            SUBPAGE_EXTRACT_SCHEMA
          );
          subPages.push(subPage);
        } catch (subPageError) {
          // One bad sub-page never aborts the whole research run.
          console.warn("[actions/research] sub-page extraction failed:", resolvedUrl, subPageError);
        }
      }

      return { homepage, subPages };
    } finally {
      await stagehand.close();
    }
  } finally {
    await browser.close();
  }
}

export async function researchCompany(jobId: string): Promise<ResearchCompanyResult> {
  if (!jobId) {
    return { success: false, error: "Missing job id." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }
  const userId: string = user.id;

  if (!isAnyAiConfigured()) {
    return { success: false, error: "AI research is not configured yet. Please try again later." };
  }
  if (!isBrowserbaseConfigured()) {
    return { success: false, error: "Company research is not configured yet. Please try again later." };
  }

  const insforge = await createInsforgeServer();

  const { data: jobRows, error: jobError } = await insforge.database
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (jobError || !jobRows) {
    return { success: false, error: "Job not found." };
  }
  const job = jobRows as Job;

  const { data: profileRows } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", userId);
  const profile = (profileRows?.[0] as Profile) || null;

  const { data: runRows, error: runInsertError } = await insforge.database
    .from("agent_runs")
    .insert([{ user_id: userId, status: "running" }])
    .select()
    .single();

  if (runInsertError || !runRows) {
    console.error("[actions/research:researchCompany] agent_runs insert error:", runInsertError);
    return { success: false, error: "Failed to start company research. Please try again." };
  }
  const runId = (runRows as { id: string }).id;

  const posthog = createPostHogServer();
  try {
    const homepageUrl = await deriveHomepageUrl(job.source_url, job.company);

    let companyResearch: { homepage: HomepageResearch; subPages: SubPageResearch[] } | null = null;
    try {
      companyResearch = await runBrowserResearch(homepageUrl);
    } catch (browserError) {
      // Browser research failing entirely is not a hard failure — synthesis
      // still proceeds with job + profile only, per build-plan: "Always
      // return a dossier — never fail silently."
      console.error("[actions/research:researchCompany] browser research error:", browserError);
      await logAgentError(
        insforge,
        runId,
        userId,
        browserError instanceof Error ? browserError.message : "Company website research failed",
        jobId
      );
    }

    const userPrompt = JSON.stringify({
      companyResearch: companyResearch
        ? { homepageUrl, ...companyResearch }
        : { homepageUrl, note: "No usable research from the company website." },
      job: {
        title: job.title,
        company: job.company,
        description: job.about_role,
        matchedSkills: job.matched_skills || [],
        missingSkills: job.missing_skills || [],
      },
      candidateProfile: {
        currentTitle: profile?.current_title ?? null,
        yearsExperience: profile?.years_experience ?? null,
        experienceLevel: profile?.experience_level ?? null,
        skills: profile?.skills ?? [],
        workExperience: profile?.work_experience ?? [],
      },
    });

    const dossier = await extractStructuredData<CompanyResearchDossier>(
      userPrompt,
      COMPANY_RESEARCH_JSON_SCHEMA,
      COMPANY_RESEARCH_SYSTEM_PROMPT
    );

    const { error: updateError } = await insforge.database
      .from("jobs")
      .update({ company_research: dossier })
      .eq("id", jobId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[actions/research:researchCompany] jobs update error:", updateError);
      await logAgentError(insforge, runId, userId, updateError.message || "Failed to save research", jobId);
      await insforge.database
        .from("agent_runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", runId);
      return { success: false, error: "Failed to save company research. Please try again." };
    }

    posthog.capture({
      distinctId: userId,
      event: "company_researched",
      properties: { userId, jobId, company: job.company },
    });

    await insforge.database
      .from("agent_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", runId);

    revalidatePath(`/find-jobs/${jobId}`);

    return { success: true, dossier };
  } catch (error) {
    console.error("[actions/research:researchCompany] Unexpected error:", error);
    await logAgentError(
      insforge,
      runId,
      userId,
      error instanceof Error ? error.message : "Company research failed",
      jobId
    );
    await insforge.database
      .from("agent_runs")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", runId);
    return { success: false, error: "Something went wrong while researching this company." };
  } finally {
    await posthog.shutdown();
  }
}
