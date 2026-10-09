import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for public reads (gated by RLS via the anon key).
 * The `server-only` import makes it a build error to import this from a Client Component.
 * The service role key is never used here — it stays in the seed/admin scripts.
 */
export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (set them in .env.local)");
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}
