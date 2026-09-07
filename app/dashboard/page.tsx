import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CompanyResearchChart } from "@/components/dashboard/CompanyResearchChart";
import { JobsOverTimeChart } from "@/components/dashboard/JobsOverTimeChart";
import { MatchScoreChart } from "@/components/dashboard/MatchScoreChart";

/**
 * Feature 14 — Dashboard page UI. All stats/charts are mock data matching
 * the design for now; Features 15-17 wire these to real DB/PostHog queries.
 */
export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-8 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Jobs Found" value="284" delta="+12%" caption="vs last week" />
          <StatCard label="Avg. Match Rate" value="82%" delta="+3%" caption="vs last week" />
          <StatCard label="Companies Researched" value="35" caption="Total researched" />
          <StatCard label="Jobs This Week" value="28" caption="New this week" />
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
