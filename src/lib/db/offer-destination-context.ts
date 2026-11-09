import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import type { DestinationContext } from "@/lib/seo/offer-destination";
import { evergreenKey } from "@/lib/seo/offer-destination";

/**
 * URL-2: builds the reusable `DestinationContext` for `resolveOfferDestination` from real data in a
 * FIXED number of queries (no N+1) — published operator evergreen pages + published bonus categories.
 * Shared across all offers on a page. Cached + tagged so publishing a page/category invalidates the
 * resolved destinations. `pageById` maps a saved override (bonuses.seo_destination_page_id) back to
 * its {casinoSlug, intent}; only PUBLISHED pages are included, so a draft/unpublished override is
 * naturally ignored (falls back to automatic resolution — never a 404).
 */
export interface OfferDestinationContext {
  publishedEvergreen: ReadonlySet<string>;
  publishedBonusCategories: ReadonlySet<string>;
  pageById: ReadonlyMap<string, { casinoSlug: string; intent: string }>;
}

export async function loadDestinationContext(): Promise<OfferDestinationContext> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo_bonus_pages");
  cacheTag("seo_categories");
  const db = getSupabaseServerClient();

  const [pagesRes, catsRes] = await Promise.all([
    db.from("seo_bonus_pages").select("id, intent, casino:casinos(slug, status)").eq("status", "published"),
    db.from("seo_categories").select("slug").eq("namespace", "bonus").eq("status", "published"),
  ]);
  if (pagesRes.error) throw new Error(`loadDestinationContext(pages): ${pagesRes.error.message}`);
  if (catsRes.error) throw new Error(`loadDestinationContext(categories): ${catsRes.error.message}`);

  const publishedEvergreen = new Set<string>();
  const pageById = new Map<string, { casinoSlug: string; intent: string }>();
  for (const r of (pagesRes.data as unknown as { id: string; intent: string; casino: { slug: string; status: string } | null }[]) ?? []) {
    if (r.casino?.status !== "published") continue; // operator must also be published
    publishedEvergreen.add(evergreenKey(r.casino.slug, r.intent));
    pageById.set(r.id, { casinoSlug: r.casino.slug, intent: r.intent });
  }
  const publishedBonusCategories = new Set(
    ((catsRes.data as unknown as { slug: string }[]) ?? []).map((r) => r.slug),
  );
  return { publishedEvergreen, publishedBonusCategories, pageById };
}

/** Build the per-offer DestinationContext (adds the saved override) from the shared context. */
export function offerContext(
  ctx: OfferDestinationContext,
  seoDestinationPageId: string | null,
): DestinationContext {
  const override = seoDestinationPageId ? ctx.pageById.get(seoDestinationPageId) ?? null : null;
  return {
    publishedEvergreen: ctx.publishedEvergreen,
    publishedBonusCategories: ctx.publishedBonusCategories,
    override: override ? { casinoSlug: override.casinoSlug, intent: override.intent } : null,
  };
}
