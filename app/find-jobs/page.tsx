import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { JobsTable } from "@/components/find-jobs/JobsTable";

/**
 * Feature 09 — UI only, mock data. No DB reads or API calls yet: search,
 * filter, sort, and pagination are all inert. Feature 10 wires the Adzuna
 * search + AI scoring; Feature 11 wires filter/sort/pagination to real data.
 * Route is gated by proxy.ts's existing matcher, so no session fetch here.
 */
export default function FindJobsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-8 py-8">
        <SearchControls />
        <JobsTable />
      </main>
      <Footer />
    </>
  );
}
