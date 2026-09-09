import { extractStructuredData, isAnyAiConfigured } from "@/lib/ai-extraction";
import { DiscoveredJob } from "@/lib/job-discovery/types";

const UAE_KEYWORDS = [
  "uae",
  "united arab emirates",
  "dubai",
  "abu dhabi",
  "sharjah",
  "ajman",
  "ras al khaimah",
  "rak",
  "fujairah",
  "umm al quwain",
  "al ain",
];

export function isUaeLocation(location: string): boolean {
  const normalized = (location || "").toLowerCase().trim();
  if (!normalized) return false;
  return UAE_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function isFirecrawlConfigured(): boolean {
  return !!process.env.FIRECRAWL_API_KEY;
}

type FirecrawlSearchResult = {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
};

type FirecrawlSearchResponse = {
  success?: boolean;
  data?: FirecrawlSearchResult[];
  error?: string;
};

type ExtractedJob = {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string | null;
  contract_type?: string | null;
};

type ExtractedJobList = {
  jobs: ExtractedJob[];
};

const JOBS_EXTRACT_SCHEMA = {
  name: "extracted_jobs_list",
  schema: {
    type: "object",
    properties: {
      jobs: {
        type: "array",
        description: "Discrete job postings extracted from the search results",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Job title" },
            company: { type: "string", description: "Hiring company name" },
            location: { type: "string", description: "City and country" },
            description: { type: "string", description: "Detailed description of responsibilities and requirements" },
            url: { type: "string", description: "Direct job link or application URL" },
            salary: { type: ["string", "null"], description: "Salary range if specified, e.g. AED 15,000/month or null" },
            contract_type: { type: ["string", "null"], description: "e.g. fulltime, contract, remote" },
          },
          required: ["title", "company", "location", "description", "url"],
        },
      },
    },
    required: ["jobs"],
  },
};

const JOBS_EXTRACT_SYSTEM_PROMPT = `You are a job data extraction assistant.
Given search result markdown and snippets from job boards (e.g. Bayt, GulfTalent, Indeed, LinkedIn), extract discrete job openings.
For each job opening:
- Extract accurate title, company name, location (e.g. Dubai, UAE), role description, and URL.
- If salary is mentioned (e.g. AED 15,000/month, $80,000/year), capture it; otherwise return null.
- Ignore generic landing pages or navigation links; focus only on actual job openings.`;

export async function searchFirecrawlJobs(
  jobTitle: string,
  location: string
): Promise<DiscoveredJob[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured in environment variables.");
  }

  const targetLocation = location.trim() || "Dubai, UAE";
  const trimmedTitle = jobTitle.trim();

  // Search regional boards for maximum relevance in UAE / Middle East
  const query = `"${trimmedTitle}" in "${targetLocation}" jobs apply site:bayt.com OR site:gulftalent.com OR site:ae.indeed.com OR site:linkedin.com/jobs`;

  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: 6,
      scrapeOptions: {
        formats: ["markdown"],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Firecrawl API error: ${response.status} ${errorText}`);
  }

  const searchData = (await response.json()) as FirecrawlSearchResponse;
  const results = searchData.data || [];

  if (results.length === 0) {
    return [];
  }

  // Attempt structured LLM extraction from Firecrawl content
  if (isAnyAiConfigured()) {
    try {
      const contentBundle = results
        .map((r, i) => {
          const content = (r.markdown || r.description || "").slice(0, 1500);
          return `Result #${i + 1}:\nTitle: ${r.title || "Untitled"}\nURL: ${r.url || ""}\nContent:\n${content}\n---`;
        })
        .join("\n\n");

      const promptInput = `TARGET JOB TITLE: ${trimmedTitle}\nLOCATION: ${targetLocation}\n\nSEARCH RESULTS TO EXTRACT JOBS FROM:\n${contentBundle}`;

      const extracted = await extractStructuredData<ExtractedJobList>(
        promptInput,
        JOBS_EXTRACT_SCHEMA,
        JOBS_EXTRACT_SYSTEM_PROMPT
      );

      if (extracted?.jobs && extracted.jobs.length > 0) {
        return extracted.jobs.map((job, idx) => ({
          id: `fc_${Date.now()}_${idx}`,
          title: job.title,
          company: job.company || "Company in " + targetLocation,
          location: job.location || targetLocation,
          description: job.description || `${job.title} position in ${targetLocation}`,
          redirect_url: job.url || results[0]?.url || "https://bayt.com",
          salary: job.salary || null,
          job_type: job.contract_type || "fulltime",
          posted_at: new Date().toISOString(),
          provider: "firecrawl",
        }));
      }
    } catch (llmError) {
      console.warn("[lib/firecrawl:searchFirecrawlJobs] LLM extraction failed, falling back to raw search results:", llmError);
    }
  }

  // Fallback: convert search results directly to DiscoveredJob instances
  return results.map((r, idx) => {
    // Strip common job board suffixes from title (e.g. "Software Engineer - Bayt.com")
    const cleanTitle = (r.title || trimmedTitle)
      .replace(/\s*[-–|]\s*(Bayt\.com|Indeed|GulfTalent|LinkedIn).*$/i, "")
      .trim();

    return {
      id: `fc_raw_${Date.now()}_${idx}`,
      title: cleanTitle || trimmedTitle,
      company: "Employer in " + targetLocation,
      location: targetLocation,
      description: r.description || r.markdown?.slice(0, 300) || `${cleanTitle} opening in ${targetLocation}`,
      redirect_url: r.url || "https://bayt.com",
      salary: null,
      job_type: "fulltime",
      posted_at: new Date().toISOString(),
      provider: "firecrawl",
    };
  });
}
