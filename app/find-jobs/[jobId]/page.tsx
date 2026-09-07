import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JobDetails } from "@/components/job-details/JobDetails";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { Job } from "@/lib/job-types";

/**
 * Feature 12 — Job Details page. Job info, match reasoning, skills, and
 * description all come from the real `jobs` row fetched here (already
 * populated by Feature 10) — no mock data. Company Research renders an
 * empty state only per build-plan scope; Feature 13 wires up the actual
 * research agent behind the "Research Company" button.
 */
export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-8 py-8">
        <JobDetails job={data as Job} />
      </main>
      <Footer />
    </>
  );
}
