import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. ONLY for server actions behind admin auth
// and trusted server code. The `server-only` import makes the build fail if this
// module is ever pulled into a client bundle.
//
// Lazily initialized: if the env is misconfigured we throw a CLEAR error the
// first time the client is USED (caught by the action's try/catch and shown in
// the UI) instead of throwing at import time — an import-time throw takes down
// the whole admin module and makes saves fail SILENTLY.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set in this environment. Add it to the deploy's environment variables and redeploy.",
    );
  }
  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** True only when both env vars are present (no client created). */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Backwards-compatible export: a thin proxy that initializes the real client on
// first property access, so existing `supabaseAdmin.from(...)` call sites are
// unchanged but no client is built (and nothing throws) at import time.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
