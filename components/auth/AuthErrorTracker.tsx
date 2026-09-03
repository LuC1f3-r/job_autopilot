"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/** Fires a PostHog event when the login page renders with an OAuth error in the URL. */
export function AuthErrorTracker({ error }: { error: string }) {
  useEffect(() => {
    posthog.capture("auth_error_shown", { error });
  }, [error]);

  return null;
}
