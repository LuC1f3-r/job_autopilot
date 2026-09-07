import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { Job } from "@/lib/job-types";
import { MATCH_THRESHOLD } from "@/lib/utils";

export const JOBS_PER_PAGE = 20;

const SORT_COLUMNS = {
  "Match Score": { column: "match_score", ascending: false },
  Newest: { column: "found_at", ascending: false },
  Oldest: { column: "found_at", ascending: true },
} as const;

export type SortLabel = keyof typeof SORT_COLUMNS;
export type MatchFilter = "All Matches" | "High Match" | "Low Match";

function isSortLabel(value: string | undefined): value is SortLabel {
  return !!value && value in SORT_COLUMNS;
}

function isMatchFilter(value: string | undefined): value is MatchFilter {
  return value === "High Match" || value === "Low Match" || value === "All Matches";
}

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Feature 11 — filter/sort/search/pagination wired to real InsForge
 * queries via URL search params (`q`, `match`, `sort`, `page`), so
 * filters are shareable/bookmarkable and survive a refresh. Route is
 * gated by proxy.ts's existing matcher, so a missing session here would
 * only happen mid-request-race; getSessionUser() returning null just
 * yields an empty list rather than crashing.
 */
export default async function FindJobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = firstParam(params, "q")?.trim() || "";
  const matchRaw = firstParam(params, "match");
  const sortRaw = firstParam(params, "sort");
  const match: MatchFilter = isMatchFilter(matchRaw) ? matchRaw : "All Matches";
  const sort: SortLabel = isSortLabel(sortRaw) ? sortRaw : "Match Score";
  const pageRaw = Number(firstParam(params, "page"));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const user = await getSessionUser();
  let jobs: Job[] = [];
  let totalCount = 0;

  if (user) {
    const insforge = await createInsforgeServer();
    let dbQuery = insforge.database
      .from("jobs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (query) {
      dbQuery = dbQuery.or(`company.ilike.%${query}%,title.ilike.%${query}%`);
    }
    if (match === "High Match") {
      dbQuery = dbQuery.gte("match_score", MATCH_THRESHOLD);
    } else if (match === "Low Match") {
      dbQuery = dbQuery.lt("match_score", MATCH_THRESHOLD);
    }

    const { column, ascending } = SORT_COLUMNS[sort];
    const from = (page - 1) * JOBS_PER_PAGE;
    const to = from + JOBS_PER_PAGE - 1;

    const { data, error, count } = await dbQuery
      .order(column, { ascending })
      .range(from, to);

    if (error) {
      console.error("[app/find-jobs/page] jobs fetch error:", error);
    } else {
      jobs = (data as Job[]) || [];
      totalCount = count ?? jobs.length;
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-8 py-8">
        <SearchControls />
        <JobsTable
          jobs={jobs}
          totalCount={totalCount}
          page={page}
          perPage={JOBS_PER_PAGE}
          query={query}
          match={match}
          sort={sort}
        />
      </main>
      <Footer />
    </>
  );
}
