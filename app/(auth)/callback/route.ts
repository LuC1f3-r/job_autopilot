import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAuthActions } from "@insforge/sdk/ssr";

const CODE_VERIFIER_COOKIE = "insforge_code_verifier";

// OAuth redirects land here with ?insforge_code=... (PKCE flow). SSR mode
// exchanges the code on the server — the SDK's browser auto-detection does
// not apply here, since createBrowserClient's auth surface has no sign-in.
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("insforge_code");
  const cookieStore = await cookies();

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const codeVerifier = cookieStore.get(CODE_VERIFIER_COOKIE)?.value;

  try {
    const auth = createAuthActions({ cookies: cookieStore });
    const { error } = await auth.exchangeOAuthCode(code, codeVerifier);

    if (error) {
      console.error("[auth/callback]", error);
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // TODO: point at /dashboard once that route exists (tracked separately).
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  } finally {
    cookieStore.delete(CODE_VERIFIER_COOKIE);
  }
}
