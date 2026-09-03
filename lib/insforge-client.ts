import { createBrowserClient } from "@insforge/sdk/ssr";

// Browser-side InsForge client — reads the (non-httpOnly) access-token
// cookie set by our Server Actions / Route Handlers. Its auth surface is
// read-only (getCurrentUser, getProfile, getPublicAuthConfig) — sign-in,
// sign-up, and sign-out are server-driven, see actions/auth.ts.
export const insforge = createBrowserClient();
