// Shared shape for a row in the `jobs` table. Feature 09 used a local
// MockJob type ahead of this landing (see context/ui-registry.md); Feature
// 10 rebases JobsTable onto this real type.

import { CompanyResearchDossier } from "@/lib/company-research-schema";

export type Job = {
  id: string;
  run_id: string | null;
  user_id: string;
  source: "search" | "url";
  source_url: string | null;
  external_apply_url: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  job_type: string | null;
  about_role: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  nice_to_have: string[] | null;
  benefits: string[] | null;
  about_company: string | null;
  match_score: number | null;
  match_reason: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  company_research: CompanyResearchDossier | null;
  found_at: string;
  // When the job was originally posted (Adzuna's `created` field for
  // source: 'search' rows). Null for URL-based jobs (Feature 12/13) or any
  // source that doesn't supply an original posting date.
  posted_at: string | null;
};
