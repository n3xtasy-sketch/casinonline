/**
 * Sitemap invalidation KNOWLEDGE (pure, no imports — unit-testable; no `server-only`).
 *
 * The sitemap (src/app/sitemap.ts) is a prerendered route whose data comes from cached reads:
 *   - getSlugs(table)            → cacheTag(table)  for casinos/games/providers/payment_methods/
 *                                                       bonuses/guides
 *   - listPublishedCategories()  → cacheTag("seo_categories")
 *   - listPublishedEvergreenPages() → cacheTag("seo_bonus_pages") (+ casinos/bonuses)
 *
 * These are the tags that must be purged so a sitemap regeneration re-reads Supabase. Keep this
 * list in sync with the sitemap's data sources (the test guards it).
 */

export const SITEMAP_CACHE_TAGS = [
  "casinos",
  "games",
  "providers",
  "payment_methods",
  "bonuses",
  "guides",
  "seo_categories",
  "seo_bonus_pages",
] as const;

export const SITEMAP_PATH = "/sitemap.xml";

/** The full invalidation plan for an out-of-band refresh (what to purge + which route to regen). */
export function sitemapInvalidationPlan(): { tags: string[]; paths: string[] } {
  return { tags: [...SITEMAP_CACHE_TAGS], paths: [SITEMAP_PATH] };
}
