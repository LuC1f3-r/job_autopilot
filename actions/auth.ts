"use server";

import { cookies, headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { createAuthActions, clearAuthCookies } from "@insforge/sdk/ssr";

const CODE_VERIFIER_COOKIE = "insforge_code_verifier";

async function getOrigin(): Promise<string> {
  const headerStore = await headers();
  const originHeader = headerStore.get("origin");
  if (originHeader) return originHeader;

  // Origin is reliably sent for same-origin Server Action POSTs, so this
  // fallback should rarely run. Default to https in production so a host
  // that doesn't set x-forwarded-proto never gets an http:// redirectTo.
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${protocol}://${headerStore.get("host")}`;
}

export async function signInWithOAuthAction(provider: "google" | "github"): Promise<void> {
  const cookieStore = await cookies();

  try {
    const auth = createAuthActions({ cookies: cookieStore });
    const origin = await getOrigin();

    const { data, error } = await auth.signInWithOAuth(provider, {
      redirectTo: `${origin}/callback`,
      skipBrowserRedirect: true,
    });

    if (error || !data?.url) {
      console.error("[actions/auth signInWithOAuthAction]", error);
      redirect("/login?error=oauth_start_failed");
    }

    if (data.codeVerifier) {
      cookieStore.set(CODE_VERIFIER_COOKIE, data.codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 5, // PKCE verifier only needs to survive the redirect round-trip
      });
    }

    redirect(data.url);
  } catch (error) {
    // redirect() throws by design — let Next.js's own control-flow errors
    // (including the two redirects above) pass through untouched.
    unstable_rethrow(error);
    console.error("[actions/auth signInWithOAuthAction]", error);
    redirect("/login?error=oauth_start_failed");
  }
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();

  try {
    const auth = createAuthActions({ cookies: cookieStore });
    await auth.signOut();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[actions/auth signOutAction]", error);
    // Force-clear our cookies even if the remote sign-out call failed, so
    // the user is never stuck "logged in" locally after an API error.
    clearAuthCookies(cookieStore);
  }

  redirect("/");
}
