import Image from "next/image";
import Link from "next/link";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthErrorTracker } from "@/components/auth/AuthErrorTracker";

const errorMessages: Record<string, string> = {
  oauth_start_failed: "Couldn't start sign-in. Please try again.",
  missing_code: "That sign-in link looks incomplete. Please try again.",
  oauth_failed: "We couldn't complete sign-in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? (errorMessages[error] ?? errorMessages.oauth_failed) : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="bg-hero-gradient w-full max-w-md rounded-2xl border border-border p-8 text-center shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <Link href="/" className="inline-flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={496}
            height={168}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in to find your next role faster.
        </p>

        {errorMessage && (
          <>
            <AuthErrorTracker error={error!} />
            <p className="mt-4 rounded-md bg-error/10 px-3 py-2 text-sm text-error">
              {errorMessage}
            </p>
          </>
        )}

        <div className="mt-8">
          <OAuthButtons />
        </div>

        <p className="mt-6 text-xs text-text-muted">
          By continuing you agree to JobPilot&apos;s Terms and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
