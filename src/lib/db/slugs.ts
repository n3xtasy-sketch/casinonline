import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";

/** Slug-only query for a content table (used by the sitemap — no card joins). */
export async function getSlugs(table: string): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(table);
  const db = getSupabaseServerClient();
  const { data, error } = await db.from(table).select("slug");
  if (error) throw new Error(`getSlugs(${table}): ${error.message}`);
  return (data as unknown as { slug: string }[]).map((r) => r.slug);
}
