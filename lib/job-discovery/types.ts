// Unified interface for jobs discovered across providers (Adzuna, Firecrawl)

export type DiscoveredJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  redirect_url: string;
  salary: string | null;
  job_type?: string;
  posted_at?: string | null;
  provider: "adzuna" | "firecrawl";
};
