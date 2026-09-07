type Props = {
  label: string;
  value: string;
  /** e.g. "+12%" — rendered as a green pill next to `caption`. Omit for a plain caption only. */
  delta?: string;
  caption: string;
};

/**
 * One of the four top-row stat tiles (Total Jobs Found, Avg. Match Rate, etc).
 * Mock data for now — Feature 15/16 will wire these to real DB/PostHog counts.
 */
export function StatCard({ label, value, delta, caption }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-primary">{value}</p>
      <div className="mt-3 flex items-center gap-2">
        {delta && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
              delta.startsWith("-")
                ? "bg-error/10 text-error"
                : "bg-success-lightest text-success-foreground"
            }`}
          >
            {delta}
          </span>
        )}
        <span className="text-xs text-text-muted">{caption}</span>
      </div>
    </div>
  );
}
