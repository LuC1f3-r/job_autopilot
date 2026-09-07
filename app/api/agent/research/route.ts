import { NextRequest, NextResponse } from "next/server";
import { researchCompany } from "@/actions/research";

// POST /api/agent/research — thin wrapper around actions/research.ts's
// researchCompany, kept for spec parity with context/build-plan.md and any
// non-UI callers. components/job-details/JobDetails.tsx calls the Server
// Action directly and does not use this route (same pattern as
// app/api/agent/find/route.ts).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobId = typeof body?.jobId === "string" ? body.jobId : "";

    const result = await researchCompany(jobId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("[api/agent/research] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to research this company" },
      { status: 500 }
    );
  }
}
