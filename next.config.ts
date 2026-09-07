import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stagehand (Feature 13 — Company Research Agent) ships a
  // `new URL("../", import.meta.url)` extension-asset lookup meant for its
  // browser-extension bundle, which Turbopack/webpack cannot statically
  // trace when bundled for the server. It's a server-only Node dependency
  // (actions/research.ts) — never imported client-side — so it's safe to
  // exclude from bundling entirely and let Node's own require/import
  // resolve it at runtime instead.
  serverExternalPackages: ["@browserbasehq/stagehand", "@browserbasehq/sdk"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
