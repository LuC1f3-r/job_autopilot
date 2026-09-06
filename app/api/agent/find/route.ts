import { NextRequest, NextResponse } from "next/server";
import { findJobs } from "@/actions/jobs";

// POST /api/agent/find — thin wrapper around actions/jobs.ts's findJobs,
// kept for spec parity with context/build-plan.md and any non-UI callers.
// components/find-jobs/SearchControls.tsx calls the Server Action directly
// and does not use this route (same pattern as ProfileForm → saveProfile).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle : "";
    const location = typeof body?.location === "string" ? body.location : "";

    const result = await findJobs(jobTitle, location);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("[api/agent/find] Unexpected error:", error);
    return NextResponse.json({ success: false, error: "Failed to search for jobs" }, { status: 500 });
  }
}
