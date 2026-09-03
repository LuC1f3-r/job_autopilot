import { NextResponse } from "next/server";
import { createRefreshAuthRouter } from "@insforge/sdk/ssr";

// The browser InsForge client (lib/insforge-client.ts) calls this route
// whenever the access-token cookie is missing or near expiry.
const { POST: refreshHandler } = createRefreshAuthRouter();

export async function POST(request: Request): Promise<Response> {
  try {
    return await refreshHandler(request);
  } catch (error) {
    console.error("[api/auth/refresh]", error);
    return NextResponse.json({ success: false, error: "Failed to refresh session" }, { status: 500 });
  }
}
