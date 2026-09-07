"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Building2, Inbox, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Job } from "@/lib/job-types";
import { formatRelativeDate } from "@/lib/format-date";
import { MatchFilter, SortLabel } from "@/app/find-jobs/page";

const MATCH_FILTER_OPTIONS = ["All Matches", "High Match", "Low Match"];
const SORT_OPTIONS = ["Match Score", "Newest", "Oldest"];

/** Color scale matches the design mock: green 90+, blue 80-89, orange below 80. */
function matchScoreColor(score: number) {
  if (score >= 90) return { bar: "bg-success", text: "text-success-foreground" };
  if (score >= 80) return { bar: "bg-info-medium", text: "text-info-foreground" };
  return { bar: "bg-warning", text: "text-warning" };
}

function MatchScoreBar({ score }: { score: number }) {
  const color = matchScoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border-light">
        <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-semibold ${color.text}`}>{score}%</span>
    </div>
  );
}

/** Small pill matching the design's badge treatment — SOURCE column. */
function SourceBadge({ source }: { source: Job["source"] }) {
  const label = source === "search" ? "Search" : "URL";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
      <LinkIcon className="h-3 w-3" />
      {label}
    </span>
  );
}

type Props = {
  jobs: Job[];
  totalCount: number;
  page: number;
  perPage: number;
  query: string;
  match: MatchFilter;
  sort: SortLabel;
};

/**
 * Filter bar, table, and pagination. Feature 11 wires all three controls to
 * real InsForge queries via URL search params (`q`, `match`, `sort`,
 * `page`) — app/find-jobs/page.tsx reads them server-side and passes the
 * already-filtered/sorted/paginated `jobs` + `totalCount` back down here.
 * This component only ever pushes new search params; it never fetches.
 */
export function JobsTable({ jobs, totalCount, page, perPage, query, match, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(query);
  const [, startTransition] = useTransition();

  const hasJobs = jobs.length > 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const from = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalCount);

  function pushParams(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushParams({ q: searchInput.trim() || null, page: 1 });
  }

  function handleMatchChange(value: string) {
    pushParams({ match: value === "All Matches" ? null : value, page: 1 });
  }

  function handleSortChange(value: string) {
    pushParams({ sort: value === "Match Score" ? null : value, page: 1 });
  }

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return;
    pushParams({ page: targetPage === 1 ? null : targetPage });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border-light p-4 md:flex-row md:items-center md:justify-between">
        <form className="md:max-w-sm md:flex-1" onSubmit={handleSearchSubmit}>
          <Input
            label=""
            aria-label="Filter by company or role"
            placeholder="Filter by company or role..."
            icon={<Search className="h-4 w-4 text-text-muted" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <div className="flex gap-3">
          <div className="w-40">
            <Select
              label=""
              aria-label="Filter by match"
              options={MATCH_FILTER_OPTIONS}
              value={match}
              onChange={(e) => handleMatchChange(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label=""
              aria-label="Sort by"
              options={SORT_OPTIONS}
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!hasJobs ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary text-text-muted">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-text-primary">
            {query || match !== "All Matches" ? "No jobs match your filters" : "No jobs yet"}
          </p>
          <p className="max-w-sm text-sm text-text-secondary">
            {query || match !== "All Matches"
              ? "Try a different search term or filter."
              : "Search for a job title above to find and score matching roles."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-light text-xs font-semibold tracking-wide text-text-secondary uppercase">
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Match Score</th>
                  <th className="px-4 py-3 font-semibold">Salary Est.</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Date Posted</th>
                  <th className="px-4 py-3 font-semibold">Date Found</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border-light last:border-b-0">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-text-secondary">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="font-semibold text-text-primary">
                          {job.company || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-primary">
                      <Link
                        href={`/find-jobs/${job.id}`}
                        className="hover:text-accent hover:underline"
                      >
                        {job.title || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {job.match_score !== null ? (
                        <MatchScoreBar score={job.match_score} />
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-text-primary">{job.salary || "—"}</td>
                    <td className="px-4 py-4">
                      <SourceBadge source={job.source} />
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {job.posted_at ? formatRelativeDate(job.posted_at) : "—"}
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {formatRelativeDate(job.found_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 p-4 text-sm text-text-secondary md:flex-row md:items-center md:justify-between">
            <p>
              Showing <span className="font-semibold text-text-primary">{from}</span> to{" "}
              <span className="font-semibold text-text-primary">{to}</span> of{" "}
              <span className="font-semibold text-text-primary">{totalCount}</span> results
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="rounded-md border border-border px-3 py-1.5 text-text-secondary disabled:cursor-not-allowed disabled:text-text-muted"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => goToPage(pageNumber)}
                  className={
                    pageNumber === page
                      ? "h-8 w-8 rounded-md border border-accent bg-accent-light text-sm font-medium text-accent"
                      : "h-8 w-8 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                  }
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                className="rounded-md border border-border px-3 py-1.5 text-text-secondary disabled:cursor-not-allowed disabled:text-text-muted"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
