import { PostHog } from "posthog-node";

// Server-side PostHog client — Server Actions/route handlers are
// short-lived, so batching is disabled (flushAt: 1, flushInterval: 0) and
// every caller must await posthog.shutdown() after capturing, or the event
// is lost when the function returns. Create a fresh client per call rather
// than sharing a module-level singleton, since shutdown() tears the client
// down.
export function createPostHogServer(): PostHog {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1,
    flushInterval: 0,
  });
}
