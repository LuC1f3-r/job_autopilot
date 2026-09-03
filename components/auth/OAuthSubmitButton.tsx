"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import posthog from "posthog-js";

type Props = {
  icon: ReactNode;
  label: string;
  pendingLabel: string;
  provider: "google" | "github";
};

export function OAuthSubmitButton({ icon, label, pendingLabel, provider }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={() => posthog.capture("oauth_sign_in_started", { provider })}
      className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {pending ? pendingLabel : label}
    </button>
  );
}
