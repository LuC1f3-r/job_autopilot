"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormButton } from "@/components/ui/form-button";
import { findJobs } from "@/actions/jobs";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

/**
 * Top search card — Job Title / Location inputs, Find Jobs button, and the
 * result banner. Feature 09 rendered this as a static Server Component;
 * Feature 10 converts it to a Client Component that calls the findJobs
 * Server Action directly (same pattern as ProfileForm → saveProfile) and
 * renders the real success/error banner from its result.
 */
export function SearchControls() {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  const isLoading = state.status === "loading";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    const result = await findJobs(jobTitle, location);

    if (result.success) {
      setState({ status: "success", message: result.message || "Search complete." });
    } else {
      setState({ status: "error", message: result.error || "Something went wrong." });
    }
  }

  return (
    <form
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
        <Input
          label="Job Title"
          name="jobTitle"
          placeholder="Frontend Engineer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          icon={<Search className="h-4 w-4 text-text-muted" />}
        />
        <Input
          label="Location"
          name="location"
          placeholder="Remote, New York..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          icon={<Search className="h-4 w-4 text-text-muted" />}
        />
        <FormButton
          type="submit"
          variant="primary"
          disabled={isLoading}
          icon={
            isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )
          }
          className="justify-center py-2.5"
        >
          {isLoading ? "Searching..." : "Find Jobs"}
        </FormButton>
      </div>

      {state.status === "success" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-lightest px-4 py-3 text-sm font-medium text-success-foreground">
          <Sparkles className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}
    </form>
  );
}
