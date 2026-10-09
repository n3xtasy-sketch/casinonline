import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";

export interface SlugRow {
  slug: string;
  updatedAt: string;
}

/** Slug + updated_at for a content table (used by the sitemap — no card joins). */
export async function getSlugs(table: string): Promise<SlugRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(table);
  const db = getSupabaseServerClient();
  const { data, error } = await db.from(table).select("slug, updated_at");
  if (error) throw new Error(`getSlugs(${table}): ${error.message}`);
  return (data as unknown as { slug: string; updated_at: string }[]).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
  }));
}
