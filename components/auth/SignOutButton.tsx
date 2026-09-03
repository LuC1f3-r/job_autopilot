"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { signOutAction } from "@/actions/auth";

type PostHogIdentifyProps = {
  userId: string;
  email: string;
  name?: string;
};

export function PostHogIdentify({ userId, email, name }: PostHogIdentifyProps) {
  useEffect(() => {
    posthog.identify(userId, {
      email,
      ...(name ? { name } : {}),
    });
  }, [email, name, userId]);

  return null;
}

export function SignOutButton() {
  const handleSubmit = () => {
    posthog.capture("user_signed_out");
    posthog.reset();
  };

  return (
    <form action={signOutAction} onSubmit={handleSubmit}>
      <button
        type="submit"
        className="inline-flex items-center rounded-md bg-text-slate px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-text-darkest"
      >
        Sign out
      </button>
    </form>
  );
}
