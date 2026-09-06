import { Search, Building2, Inbox, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Job } from "@/lib/job-types";

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

// Lightweight relative-time formatting ("2 hours ago", "Yesterday", "4 days
// ago") — no date library in this project yet, and this is the only place
// that needs one so far. Shared by both Date Found (found_at) and Date
// Posted (posted_at).
function formatRelativeDate(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
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
};

/**
 * Filter bar, table, and pagination. Feature 10 replaces Feature 09's mock
 * MOCK_JOBS array with the real jobs passed in from app/find-jobs/page.tsx
 * and adds an empty state for no results. Filter bar, sort dropdowns, and
 * pagination remain visually present but inert — Feature 11 wires these
 * controls to real InsForge queries.
 */
export function JobsTable({ jobs }: Props) {
  const hasJobs = jobs.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border-light p-4 md:flex-row md:items-center md:justify-between">
        <div className="md:max-w-sm md:flex-1">
          <Input
            label=""
            aria-label="Filter by company or role"
            placeholder="Filter by company or role..."
            icon={<Search className="h-4 w-4 text-text-muted" />}
          />
        </div>
        <div className="flex gap-3">
          <div className="w-40">
            <Select label="" aria-label="Filter by match" options={MATCH_FILTER_OPTIONS} />
          </div>
          <div className="w-40">
            <Select label="" aria-label="Sort by" options={SORT_OPTIONS} />
          </div>
        </div>
      </div>

      {!hasJobs ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary text-text-muted">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-text-primary">No jobs yet</p>
          <p className="max-w-sm text-sm text-text-secondary">
            Search for a job title above to find and score matching roles.
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
                      {job.source_url ? (
                        <a
                          href={job.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent hover:underline"
                        >
                          {job.title || "—"}
                        </a>
                      ) : (
                        job.title || "—"
                      )}
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
              Showing <span className="font-semibold text-text-primary">1</span> to{" "}
              <span className="font-semibold text-text-primary">{jobs.length}</span> of{" "}
              <span className="font-semibold text-text-primary">{jobs.length}</span> results
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled
                className="rounded-md border border-border px-3 py-1.5 text-text-muted disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-md border border-accent bg-accent-light text-sm font-medium text-accent"
              >
                1
              </button>
              <button
                type="button"
                disabled
                className="rounded-md border border-border px-3 py-1.5 text-text-muted disabled:cursor-not-allowed"
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
