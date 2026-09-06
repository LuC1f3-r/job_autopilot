import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormButton } from "@/components/ui/form-button";

/**
 * Top search card — Job Title / Location inputs, Find Jobs button, and the
 * success banner. Feature 09 renders this fully static (mock copy, inert
 * button); Feature 10 wires the real Adzuna search behind it.
 */
export function SearchControls() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
        <Input
          label="Job Title"
          name="jobTitle"
          placeholder="Frontend Engineer"
          defaultValue="Frontend Engineer"
          icon={<Search className="h-4 w-4 text-text-muted" />}
        />
        <Input
          label="Location"
          name="location"
          placeholder="Remote, New York..."
          icon={<Search className="h-4 w-4 text-text-muted" />}
        />
        <FormButton
          variant="primary"
          icon={<Search className="h-4 w-4" />}
          className="justify-center py-2.5"
        >
          Find Jobs
        </FormButton>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-lightest px-4 py-3 text-sm font-medium text-success-foreground">
        <Sparkles className="h-4 w-4 shrink-0" />
        Found 8 jobs and saved 4 strong matches.
      </div>
    </div>
  );
}
