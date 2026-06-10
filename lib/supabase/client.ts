import { createClient } from "@supabase/supabase-js";

// Anonymous client — safe for the browser and for server components doing
// RLS-permitted reads (drops, drop_flavors, active merch) and the two public
// insert paths (interest_submissions, email_list). Never used for admin writes.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
