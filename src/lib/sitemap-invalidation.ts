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
  "payments", // payment_methods data is tagged "payments" (see cacheTagForTable)
  "bonuses",
  "guides",
  "seo_categories",
  "seo_bonus_pages",
] as const;

export const SITEMAP_PATH = "/sitemap.xml";

/**
 * Canonical cache tag for a content table. Every table tags by its own name EXCEPT
 * `payment_methods`: its public reads (src/lib/db/payments.ts) and all its mutations/import
 * (metode-de-plata actions, entities descriptor) use the shorter "payments" tag. getSlugs() must
 * align to it, otherwise a payment-method change (which fires updateTag("payments")) never
 * invalidates the sitemap's payment data (tagged "payment_methods" = a dead tag no one purges).
 */
export function cacheTagForTable(table: string): string {
  return table === "payment_methods" ? "payments" : table;
}

/** The full invalidation plan for an out-of-band refresh (what to purge + which route to regen). */
export function sitemapInvalidationPlan(): { tags: string[]; paths: string[] } {
  return { tags: [...SITEMAP_CACHE_TAGS], paths: [SITEMAP_PATH] };
}

/**
 * Whether a finished CSV import should regenerate the sitemap. All importable entities
 * (casinos/bonuses/games/providers/payment_methods/guides) are sitemap sources, so the only
 * question is whether any row actually changed: a no-op import (only unchanged/skipped/failed)
 * leaves the sitemap identical and must NOT trigger a needless regeneration.
 */
export function shouldRevalidateSitemapAfterImport(outcome: { created: number; updated: number }): boolean {
  return outcome.created > 0 || outcome.updated > 0;
}
