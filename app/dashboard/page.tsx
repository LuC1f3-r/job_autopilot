import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CompanyResearchChart } from "@/components/dashboard/CompanyResearchChart";
import { JobsOverTimeChart } from "@/components/dashboard/JobsOverTimeChart";
import { MatchScoreChart } from "@/components/dashboard/MatchScoreChart";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import {
  calculateDashboardStats,
  DashboardJob,
} from "@/lib/dashboard-stats";

/**
 * Feature 15 — Stats bar wired to real InsForge DB queries for the signed-in user:
 * - Total Jobs Found: COUNT of jobs for current user
 * - Avg. Match Rate: AVG of match_score across all user jobs
 * - Companies Researched: COUNT of jobs with company_research IS NOT NULL (distinct companies)
 * - Jobs This Week: COUNT of jobs found in the last 7 days
 *
 * Recent Activity and Charts remain mock data matching the design (Features 16 & 17).
 */
export default async function DashboardPage() {
  const user = await getSessionUser();
  let jobs: DashboardJob[] = [];

  if (user) {
    try {
      const insforge = await createInsforgeServer();
      const { data, error } = await insforge.database
        .from("jobs")
        .select("id, company, match_score, found_at, company_research")
        .eq("user_id", user.id);

      if (error) {
        console.error("[dashboard] Failed to fetch user jobs for stats bar:", error);
      } else if (data) {
        jobs = data as DashboardJob[];
      }
    } catch (error) {
      console.error("[dashboard] Unexpected error fetching jobs for stats bar:", error);
    }
  }

  const stats = calculateDashboardStats(jobs);

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-8 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Jobs Found"
            value={stats.totalJobsCount.toLocaleString()}
            delta={stats.totalJobsDelta}
            caption={stats.totalJobsCaption}
          />
          <StatCard
            label="Avg. Match Rate"
            value={`${stats.avgMatchScore}%`}
            delta={stats.matchRateDelta}
            caption={stats.matchRateCaption}
          />
          <StatCard
            label="Companies Researched"
            value={stats.companiesResearchedCount.toLocaleString()}
            caption="Total researched"
          />
          <StatCard
            label="Jobs This Week"
            value={stats.jobsThisWeekCount.toLocaleString()}
            caption="New this week"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentActivity />
          <CompanyResearchChart />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <JobsOverTimeChart />
          <MatchScoreChart />
        </div>
      </main>
      <Footer />
    </>
  );
}
