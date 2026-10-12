import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import type { SeoOverride, SeoType } from "@/lib/seo";

const SEO_COLUMNS =
  "meta_title, meta_description, canonical, robots_index, robots_follow, og_title, og_description, og_image";

const TABLE: Record<SeoType, string> = {
  casino: "casinos",
  game: "games",
  provider: "providers",
  payment_method: "payment_methods",
  bonus: "bonuses",
  guide: "guides",
};

/** entity_id for a slug (immutable → cache with the entity tag). null if not found. */
async function entityIdBySlug(type: SeoType, slug: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo");
  const db = getSupabaseServerClient();
  const { data } = await db.from(TABLE[type]).select("id").eq("slug", slug).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function getSeoById(type: SeoType, id: string): Promise<SeoOverride | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo");
  const db = getSupabaseServerClient();
  const { data } = await db
    .from("seo_metadata")
    .select(SEO_COLUMNS)
    .eq("entity_type", type)
    .eq("entity_id", id)
    .maybeSingle();
  return (data as SeoOverride | null) ?? null;
}

/** Public SEO override for a given entity slug (or null → pages use their defaults). */
export async function getSeoForSlug(type: SeoType, slug: string): Promise<SeoOverride | null> {
  const id = await entityIdBySlug(type, slug);
  return id ? getSeoById(type, id) : null;
}
