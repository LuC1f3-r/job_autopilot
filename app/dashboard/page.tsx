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
import {
  buildRecentActivities,
  AgentRunRow,
  ActivityItem,
} from "@/lib/dashboard-activity";

/**
 * Feature 15 & 16 — Dashboard page with real InsForge DB data:
 * - Feature 15: Stats bar (Total Jobs, Avg Match Rate, Companies Researched, Jobs This Week)
 * - Feature 16: Recent Activity (reverse-chronological feed of job searches and company research)
 *
 * Feature 17 will wire the three analytics charts to real PostHog data.
 */
export default async function DashboardPage() {
  const user = await getSessionUser();
  let jobs: DashboardJob[] = [];
  let runs: AgentRunRow[] = [];

  if (user) {
    try {
      const insforge = await createInsforgeServer();
      const [jobsRes, runsRes] = await Promise.all([
        insforge.database
          .from("jobs")
          .select("id, company, match_score, found_at, company_research")
          .eq("user_id", user.id),
        insforge.database
          .from("agent_runs")
          .select("id, status, job_title_searched, jobs_found, completed_at, started_at")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .not("job_title_searched", "is", null)
          .order("completed_at", { ascending: false })
          .limit(10),
      ]);

      if (jobsRes.error) {
        console.error("[dashboard] Failed to fetch user jobs:", jobsRes.error);
      } else if (jobsRes.data) {
        jobs = jobsRes.data as DashboardJob[];
      }

      if (runsRes.error) {
        console.error("[dashboard] Failed to fetch agent runs:", runsRes.error);
      } else if (runsRes.data) {
        runs = runsRes.data as AgentRunRow[];
      }
    } catch (error) {
      console.error("[dashboard] Unexpected error fetching dashboard data:", error);
    }
  }

  const stats = calculateDashboardStats(jobs);
  const activities: ActivityItem[] = buildRecentActivities(runs, jobs, 5);

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
          <RecentActivity activities={activities} />
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
