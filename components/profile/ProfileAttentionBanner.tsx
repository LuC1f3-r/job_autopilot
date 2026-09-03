import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";

type Props = {
  completionPercent: number;
  missingFields: string[];
};

export function ProfileAttentionBanner({ completionPercent, missingFields }: Props) {
  const isComplete = completionPercent === 100 || missingFields.length === 0;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 text-error" />
          )}
          <h2 className="text-base font-semibold text-text-primary">
            {isComplete ? "Profile complete" : "Profile needs attention"}
          </h2>
        </div>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          {isComplete
            ? "Your profile is fully completed and ready for AI-tailored job matches and resume generation."
            : "Complete the missing fields to improve your chance of getting tailored matches and generating quality resumes."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isComplete ? (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-success uppercase">
              All set
            </span>
          ) : (
            missingFields.map((field) => (
              <span
                key={field}
                className="rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-error uppercase"
              >
                {field}
              </span>
            ))
          )}
        </div>
      </div>
      <ProgressRing percent={completionPercent} />
    </div>
  );
}
