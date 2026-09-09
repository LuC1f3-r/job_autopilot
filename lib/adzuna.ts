// Adzuna job search — see context/library-docs.md's "Adzuna API" section
// for the documented request/response shape and the rules this follows.

export type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string; // snippet only — not full description
  redirect_url: string; // Adzuna tracking URL → redirects to actual job
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted: "0" | "1";
  contract_type?: string;
  created: string;
  category: { tag: string; label: string };
};

type AdzunaSearchResponse = {
  results?: AdzunaJob[];
};

import { DiscoveredJob } from "./job-discovery/types";

export type SupportedAdzunaCountry = "us" | "gb" | "au" | "ca" | "it" | "be" | "at";

// City/region keywords mapped to Adzuna country codes.
const COUNTRY_KEYWORDS: { country: Exclude<SupportedAdzunaCountry, "us">; keywords: string[] }[] = [
  {
    country: "it",
    keywords: [
      "italy",
      "italia",
      "milan",
      "milano",
      "rome",
      "roma",
      "turin",
      "torino",
      "naples",
      "napoli",
      "florence",
      "firenze",
      "bologna",
      "genoa",
      "genova",
      "venice",
      "venezia",
      "verona",
    ],
  },
  {
    country: "be",
    keywords: [
      "belgium",
      "belgique",
      "belgië",
      "brussels",
      "bruxelles",
      "brussel",
      "antwerp",
      "antwerpen",
      "ghent",
      "gent",
      "liege",
      "liège",
      "bruges",
      "brugge",
      "leuven",
      "namur",
    ],
  },
  {
    country: "at",
    keywords: [
      "austria",
      "österreich",
      "oesterreich",
      "vienna",
      "wien",
      "graz",
      "linz",
      "salzburg",
      "innsbruck",
      "klagenfurt",
    ],
  },
  {
    country: "au",
    keywords: [
      "australia",
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
      "adelaide",
      "canberra",
      "gold coast",
      "hobart",
      "darwin",
    ],
  },
  {
    country: "gb",
    keywords: [
      "uk",
      "united kingdom",
      "england",
      "scotland",
      "wales",
      "london",
      "manchester",
      "birmingham",
      "edinburgh",
      "glasgow",
    ],
  },
  {
    country: "ca",
    keywords: [
      "canada",
      "toronto",
      "vancouver",
      "montreal",
      "ottawa",
      "calgary",
      "edmonton",
    ],
  },
];

export function detectCountry(location: string): SupportedAdzunaCountry {
  const normalized = location.toLowerCase().trim();
  if (!normalized) return "us";

  for (const { country, keywords } of COUNTRY_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return country;
    }
  }
  return "us";
}

export function formatAdzunaSalary(job: AdzunaJob, country: string = "us"): string | null {
  if (!job.salary_min) return null;
  const min = Math.round(job.salary_min / 1000);
  const max = job.salary_max ? Math.round(job.salary_max / 1000) : min;
  const symbol = country === "gb" ? "£" : (country === "it" || country === "be" || country === "at") ? "€" : "$";
  return `${symbol}${min}k - ${symbol}${max}k`;
}

export function toDiscoveredJob(job: AdzunaJob, country: string = "us"): DiscoveredJob {
  return {
    id: String(job.id),
    title: job.title,
    company: job.company?.display_name || "Unknown Company",
    location: job.location?.display_name || "Remote",
    description: job.description || "",
    redirect_url: job.redirect_url,
    salary: formatAdzunaSalary(job, country),
    job_type: job.contract_type || "fulltime",
    posted_at: job.created || null,
    provider: "adzuna",
  };
}

const REMOTE_REGEX = /\b(remote|work from home|wfh|telecommute|anywhere)\b/i;

const CITY_NORMALIZATIONS: Record<string, string> = {
  brussels: "Bruxelles",
  milan: "Milano",
  rome: "Roma",
  vienna: "Wien",
};

export function parseLocation(rawLocation: string): { where: string; isRemote: boolean } {
  const trimmed = (rawLocation || "").trim();
  const isRemote = REMOTE_REGEX.test(trimmed);
  let cleanedPlace = trimmed
    .replace(new RegExp(REMOTE_REGEX.source, "gi"), "")
    .replace(/[()]/g, "")
    .replace(/^[,/\-\s]+|[,/\-\s]+$/g, "")
    .trim();

  const lower = cleanedPlace.toLowerCase();
  for (const [english, local] of Object.entries(CITY_NORMALIZATIONS)) {
    if (lower === english || lower.includes(english)) {
      cleanedPlace = cleanedPlace.replace(new RegExp(english, "gi"), local);
      break;
    }
  }

  return {
    where: cleanedPlace,
    isRemote,
  };
}

export async function searchJobs(
  jobTitle: string,
  location: string,
  country: string = "us"
): Promise<AdzunaJob[]> {
  const { where, isRemote } = parseLocation(location || "");

  let searchQuery = jobTitle.trim();
  if (isRemote && !REMOTE_REGEX.test(searchQuery)) {
    searchQuery = `${searchQuery} remote`;
  }

  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: searchQuery,
    category: "it-jobs", // always filter to IT jobs
    results_per_page: "10",
    "content-type": "application/json",
  });

  // Only add where if a specific geographic place remains
  if (where) {
    params.set("where", where);
  }

  const fetchSearch = async (searchParams: URLSearchParams) => {
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${searchParams}`
    );
    if (!res.ok) {
      throw new Error(`Adzuna API error: ${res.status}`);
    }
    return (await res.json()) as AdzunaSearchResponse;
  };

  const data = await fetchSearch(params);

  // If a location was specified but Adzuna returned 0 results, retry without the geographic constraint
  // so the user still gets relevant jobs for their title (especially for international/unindexed locations)
  if ((!data.results || data.results.length === 0) && where) {
    const fallbackParams = new URLSearchParams(params);
    fallbackParams.delete("where");
    try {
      const fallbackData = await fetchSearch(fallbackParams);
      if (fallbackData.results && fallbackData.results.length > 0) {
        return fallbackData.results;
      }
    } catch {
      // Ignore fallback error and return original data
    }
  }

  return data.results || [];
}
