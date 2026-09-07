import Link from "next/link";
import {
  ChevronLeft,
  ExternalLink,
  DollarSign,
  MapPin,
  Briefcase,
  Calendar,
  Sparkles,
  FileText,
  Building2,
  Search,
  Check,
  X,
} from "lucide-react";
import { Job } from "@/lib/job-types";
import { formatRelativeDate } from "@/lib/format-date";

/** Match score badge color — same green/blue/orange scale JobsTable uses. */
function matchScoreBadgeClass(score: number) {
  if (score >= 90) return "bg-success-lightest text-success-foreground";
  if (score >= 80) return "bg-info-lightest text-info-foreground";
  return "bg-warning/10 text-warning";
}

type InfoCardProps = {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
};

function InfoCard({ icon, iconBg, value, label }: InfoCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-text-primary">{value}</p>
        <p className="text-xs font-medium tracking-wide text-text-muted uppercase">{label}</p>
      </div>
    </div>
  );
}

type Props = {
  job: Job;
};

export function JobDetails({ job }: Props) {
  const matchedSkills = job.matched_skills || [];
  const missingSkills = job.missing_skills || [];

  return (
    <>
      <Link
        href="/find-jobs"
        className="flex w-fit items-center gap-1 text-sm font-medium text-text-secondary hover:text-accent"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-text-muted">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{job.title || "—"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>{job.company || "—"}</span>
              {job.match_score !== null && (
                <>
                  <span className="text-text-muted">•</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${matchScoreBadgeClass(job.match_score)}`}
                  >
                    {job.match_score}% Match Score
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {job.source_url && (
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            View Job Post
          </a>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoCard
          icon={<DollarSign className="h-5 w-5 text-success" />}
          iconBg="bg-success-lightest"
          value={job.salary || "—"}
          label="Salary Est."
        />
        <InfoCard
          icon={<MapPin className="h-5 w-5 text-info-dark" />}
          iconBg="bg-info-lightest"
          value={job.location || "—"}
          label="Location"
        />
        <InfoCard
          icon={<Briefcase className="h-5 w-5 text-accent" />}
          iconBg="bg-accent-muted"
          value={job.job_type || "—"}
          label="Job Type"
        />
        <InfoCard
          icon={<Calendar className="h-5 w-5 text-text-secondary" />}
          iconBg="bg-surface-secondary"
          value={formatRelativeDate(job.found_at)}
          label="Date Found"
        />
      </div>

      {/* AI Match Reasoning */}
      {job.match_reason && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-text-secondary uppercase">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-lightest text-success">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            AI Match Reasoning
          </div>
          <p className="text-sm leading-relaxed text-text-primary">{job.match_reason}</p>
        </div>
      )}

      {/* Required Skills vs Your Profile */}
      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="mb-4 text-xs font-semibold tracking-wide text-text-secondary uppercase">
            Required Skills vs Your Profile
          </p>

          {matchedSkills.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm text-text-muted">You have</p>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 rounded-full bg-success-lightest px-3 py-1 text-sm font-medium text-success-foreground"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {missingSkills.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-text-muted">Gap skills</p>
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 rounded-full bg-accent-muted px-3 py-1 text-sm font-medium text-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job Description */}
      {job.about_role && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-text-secondary">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-text-primary">Job Description</h2>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line text-text-secondary">
            {job.about_role}
          </p>
          {job.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Read full description on {job.company || "the company"}&apos;s site
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Company Research — empty state only, Feature 13 wires the agent */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
              <Building2 className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-text-primary">Company Research</h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-dark"
          >
            <Search className="h-4 w-4" />
            Research Company
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 border-t border-border-light px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary text-text-muted">
            <Building2 className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-text-primary">No research yet</p>
          <p className="max-w-sm text-sm text-text-secondary">
            Click &ldquo;Research Company&rdquo; to let the AI browse {job.company || "the company"}
            &apos;s public pages and build a dossier.
          </p>
        </div>
      </div>

      {/* Apply Now */}
      {job.external_apply_url && (
        <a
          href={job.external_apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground hover:bg-accent-dark"
        >
          Apply Now at {job.company || "Company"}
        </a>
      )}
    </>
  );
}
