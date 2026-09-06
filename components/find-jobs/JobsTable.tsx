import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/**
 * Shape anticipates Feature 10's `jobs` table row (company, role, matchScore,
 * salaryEst, dateFound) — no shared `Job` type exists yet since that schema
 * hasn't been written. Rebase onto the real type once Feature 10 lands.
 */
type MockJob = {
  company: string;
  role: string;
  matchScore: number;
  salaryEst: string;
  dateFound: string;
};

const MOCK_JOBS: MockJob[] = [
  { company: "Vercel", role: "Senior Frontend Engineer", matchScore: 94, salaryEst: "$160k - $200k", dateFound: "2 hours ago" },
  { company: "Stripe", role: "Staff UI Engineer", matchScore: 88, salaryEst: "$180k - $240k", dateFound: "Yesterday" },
  { company: "Linear", role: "Product Engineer", matchScore: 96, salaryEst: "$150k - $190k", dateFound: "Yesterday" },
  { company: "Notion", role: "Frontend Developer", matchScore: 72, salaryEst: "$130k - $170k", dateFound: "2 days ago" },
  { company: "OpenAI", role: "Design Engineer", matchScore: 91, salaryEst: "$200k - $280k", dateFound: "3 days ago" },
  { company: "Figma", role: "Software Engineer, Editor", matchScore: 85, salaryEst: "$170k - $220k", dateFound: "4 days ago" },
];

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

/**
 * Filter bar, table, and pagination — all inert in Feature 09 (mock data,
 * no filter/sort/search logic). Feature 11 wires these controls to real
 * InsForge queries.
 */
export function JobsTable() {
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-light text-xs font-semibold tracking-wide text-text-secondary uppercase">
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Match Score</th>
              <th className="px-4 py-3 font-semibold">Salary Est.</th>
              <th className="px-4 py-3 font-semibold">Date Found</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_JOBS.map((job) => (
              <tr key={job.company} className="border-b border-border-light last:border-b-0">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-text-secondary">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-text-primary">{job.company}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-text-primary">{job.role}</td>
                <td className="px-4 py-4">
                  <MatchScoreBar score={job.matchScore} />
                </td>
                <td className="px-4 py-4 text-text-primary">{job.salaryEst}</td>
                <td className="px-4 py-4 text-text-secondary">{job.dateFound}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 p-4 text-sm text-text-secondary md:flex-row md:items-center md:justify-between">
        <p>
          Showing <span className="font-semibold text-text-primary">1</span> to{" "}
          <span className="font-semibold text-text-primary">6</span> of{" "}
          <span className="font-semibold text-text-primary">24</span> results
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled
            className="rounded-md border border-border px-3 py-1.5 text-text-muted disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              className={`h-8 w-8 rounded-md border text-sm font-medium ${
                page === 1
                  ? "border-accent bg-accent-light text-accent"
                  : "border-border text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              {page}
            </button>
          ))}
          <span className="px-1 text-text-muted">...</span>
          <button
            type="button"
            className="h-8 w-8 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary"
          >
            8
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-text-secondary hover:bg-surface-secondary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
