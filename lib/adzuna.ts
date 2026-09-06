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

// City/region keywords mapped to Adzuna country codes. Not geocoding — a
// static lookup covering the countries Adzuna's API actually supports for
// this project (context/library-docs.md: default 'us', support gb/au/ca).
// Falls back to 'us' when nothing matches, same as an empty location.
const COUNTRY_KEYWORDS: { country: "gb" | "au" | "ca"; keywords: string[] }[] = [
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
    country: "au",
    keywords: [
      "australia",
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
      "adelaide",
      "canberra",
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

export function detectCountry(location: string): "us" | "gb" | "au" | "ca" {
  const normalized = location.toLowerCase().trim();
  if (!normalized) return "us";

  for (const { country, keywords } of COUNTRY_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return country;
    }
  }
  return "us";
}

const REMOTE_REGEX = /\b(remote|work from home|wfh|telecommute|anywhere)\b/i;

export function parseLocation(rawLocation: string): { where: string; isRemote: boolean } {
  const trimmed = (rawLocation || "").trim();
  const isRemote = REMOTE_REGEX.test(trimmed);
  const cleanedPlace = trimmed
    .replace(new RegExp(REMOTE_REGEX.source, "gi"), "")
    .replace(/[()]/g, "")
    .replace(/^[,/\-\s]+|[,/\-\s]+$/g, "")
    .trim();

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
