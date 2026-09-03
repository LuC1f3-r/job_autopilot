import type { ReactNode } from "react";
import { signInWithOAuthAction } from "@/actions/auth";
import { OAuthSubmitButton } from "@/components/auth/OAuthSubmitButton";

type Provider = "google" | "github";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3a7.34 7.34 0 0 1-10.9-3.86H1.18v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.17 14.23a7.2 7.2 0 0 1 0-4.46V6.68H1.18a12 12 0 0 0 0 10.64l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.18 6.68l3.99 3.09A7.16 7.16 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.4 0 12.07c0 5.34 3.44 9.86 8.21 11.46.6.11.82-.26.82-.58v-2.24c-3.34.73-4.04-1.44-4.04-1.44-.55-1.4-1.33-1.77-1.33-1.77-1.09-.75.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.85 2.81 1.31 3.49 1 .11-.79.42-1.31.76-1.62-2.66-.31-5.47-1.34-5.47-5.96 0-1.32.46-2.4 1.23-3.24-.12-.31-.53-1.55.12-3.24 0 0 1-.33 3.3 1.24a11.2 11.2 0 0 1 6 0c2.29-1.57 3.29-1.24 3.29-1.24.66 1.69.24 2.93.12 3.24.77.84 1.23 1.92 1.23 3.24 0 4.63-2.81 5.65-5.49 5.95.43.38.81 1.12.81 2.27v3.36c0 .32.22.7.83.58A11.99 11.99 0 0 0 24 12.07C24 5.4 18.63 0 12 0Z" />
    </svg>
  );
}

const providers: { id: Provider; label: string; icon: ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
  { id: "github", label: "Continue with GitHub", icon: <GithubIcon /> },
];

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-3">
      {providers.map(({ id, label, icon }) => (
        <form key={id} action={signInWithOAuthAction.bind(null, id)}>
          <OAuthSubmitButton
            icon={icon}
            label={label}
            pendingLabel="Redirecting…"
            provider={id}
          />
        </form>
      ))}
    </div>
  );
}
