import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { Job } from "@/lib/job-types";

/**
 * Feature 10 — real jobs data. Fetches the current user's jobs (newest
 * first), no filter/sort/pagination logic yet — Feature 11 wires the
 * filter bar, sort dropdowns, and pagination to real queries. Route is
 * gated by proxy.ts's existing matcher, so a missing session here would
 * only happen mid-request-race; getSessionUser() returning null just
 * yields an empty list rather than crashing.
 */
export default async function FindJobsPage() {
  const user = await getSessionUser();
  let jobs: Job[] = [];

  if (user) {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.database
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("found_at", { ascending: false });

    if (error) {
      console.error("[app/find-jobs/page] jobs fetch error:", error);
    } else {
      jobs = (data as Job[]) || [];
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-8 py-8">
        <SearchControls />
        <JobsTable jobs={jobs} />
      </main>
      <Footer />
    </>
  );
}
