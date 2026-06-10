import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. ONLY for server actions behind admin auth
// and trusted server code. The `server-only` import above makes the build fail
// if this module is ever pulled into a client bundle.
//
// Note: standalone scripts (seed, verify) can't import this file because
// `server-only` throws outside the React Server context — they build their own
// service client from the same env vars instead.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
