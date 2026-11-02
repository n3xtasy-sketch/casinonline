import "server-only";
import { updateTag, revalidatePath } from "next/cache";
import { sitemapInvalidationPlan, SITEMAP_PATH } from "@/lib/sitemap-invalidation";

/**
 * Sitemap cache invalidation (server-only). The sitemap is a PRERENDERED route, so an
 * `updateTag(table)` from a CMS mutation purges the underlying data but does NOT regenerate the
 * static /sitemap.xml route — `revalidatePath` does. Call these from Server Actions only.
 */

/**
 * Per-mutation: regenerate the prerendered sitemap route. The calling action already did its own
 * `updateTag(<table>)` (which purges that table's getSlugs data), so this only needs to force the
 * route to re-render + purge its Vercel cache so it re-reads the fresh data.
 */
export function revalidateSitemap(): void {
  revalidatePath(SITEMAP_PATH);
}

/**
 * Full refresh for OUT-OF-BAND changes (e.g. a direct SQL UPDATE that bypassed every updateTag,
 * like the casino-slug migration): purge every data tag the sitemap reads, then regenerate the
 * route. Used by the manual Admin action.
 */
export function revalidateSitemapAll(): void {
  const { tags, paths } = sitemapInvalidationPlan();
  for (const t of tags) updateTag(t);
  for (const p of paths) revalidatePath(p);
}
