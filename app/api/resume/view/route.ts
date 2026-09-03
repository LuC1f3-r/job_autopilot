import { NextResponse } from "next/server";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const insforge = await createInsforgeServer();
    const { data: blob, error } = await insforge.storage
      .from("resumes")
      .download(`${user.id}/resume.pdf`);

    if (error || !blob) {
      console.error("[api/resume/view] Storage download error:", error);
      return new NextResponse(error?.message || "Resume not found", {
        status: 404,
      });
    }

    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[api/resume/view] Unexpected error:", err);
    return new NextResponse("Failed to load resume", { status: 500 });
  }
}
