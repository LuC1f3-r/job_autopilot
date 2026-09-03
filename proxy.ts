import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession, DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr/middleware";

// Next.js 16 renamed middleware.ts -> proxy.ts (same file convention,
// functionality unchanged).
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/find-jobs"];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  try {
    // Refreshes the access-token cookie when it's missing or near expiry,
    // so protected pages always see a fresh session.
    await updateSession({
      requestCookies: request.cookies,
      responseCookies: response.cookies,
    });
  } catch (error) {
    // Refresh failing (e.g. InsForge unreachable) shouldn't 500 the whole
    // request — fall through to the presence check below with whatever
    // cookie the request already had.
    console.error("[proxy]", error);
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) return response;

  const hasSession = request.cookies.has(DEFAULT_ACCESS_TOKEN_COOKIE);
  if (hasSession) return response;

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirectTo", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/find-jobs/:path*"],
};
