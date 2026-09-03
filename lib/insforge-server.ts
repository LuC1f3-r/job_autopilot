import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import type { UserSchema } from "@insforge/shared-schemas";

// Server-side InsForge client — reads the access-token cookie and sends it
// as the per-request bearer token. Use in Server Components / Server
// Actions / Route Handlers that need to act as the current user.
export async function createInsforgeServer() {
  return createServerClient({
    cookies: await cookies(),
  });
}

// Resolves the current signed-in user from the session cookie, or null.
export async function getSessionUser(): Promise<UserSchema | null> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data?.user) return null;
  return data.user;
}
