import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Public reads for evergreen operator bonus pages (SEO-C). Editorial + the featured-offer
 * REFERENCE come from seo_bonus_pages (tagged seo_bonus_pages/casinos). The live commercial
 * offer is read SEPARATELY, tagged "bonuses", so a bonus edit (which already fires
 * updateTag("bonuses")) propagates here too — single source of truth stays `bonuses`.
 * "Is the offer live" is NOT computed here (it must be evaluated per-request against the current
 * date in the page, after connection(), so an expiry never gets frozen in cache).
 */

export interface EvergreenPage {
  id: string;
  intent: string;
  casinoSlug: string;
  casinoName: string;
  featuredBonusId: string | null;
  h1: string | null;
  intro: string | null;
  body: string | null;
  faq: { question: string; answer: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface FeaturedBonus {
  slug: string;
  offer: string;
  freeSpins: number | null;
  wagering: string | null;
  code: string | null;
  claimUrl: string | null;
  minDeposit: string | null;
  validity: string | null;
  terms: string[];
  bonusTypeLabel: string | null;
  /** Classification (for defensive intent-match at render — CMS also validates on save). */
  typeSlug: string;
  freeSpinsForMatch: number | null;
  isNoDeposit: boolean;
  isNoWagering: boolean;
  /** Raw lifecycle fields — "live" is decided per-request in the page, not cached. */
  status: string;
  expiresAt: string | null;
}

export async function getPublishedEvergreenPage(operatorSlug: string, intent: string): Promise<EvergreenPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo_bonus_pages");
  cacheTag("casinos");
  const db = getSupabaseServerClient();
  const { data: casino, error: cErr } = await db
    .from("casinos").select("id, slug, name").eq("slug", operatorSlug).eq("status", "published").maybeSingle();
  if (cErr) throw new Error(`getPublishedEvergreenPage(casino): ${cErr.message}`);
  if (!casino) return null;
  const c = casino as unknown as { id: string; slug: string; name: string };

  const { data, error } = await db
    .from("seo_bonus_pages")
    .select("id, intent, featured_bonus_id, h1, intro, body, faq, meta_title, meta_description")
    .eq("casino_id", c.id).eq("intent", intent).eq("status", "published").maybeSingle();
  if (error) throw new Error(`getPublishedEvergreenPage(page): ${error.message}`);
  if (!data) return null;
  const r = data as unknown as {
    id: string; intent: string; featured_bonus_id: string | null; h1: string | null; intro: string | null;
    body: string | null; faq: { question: string; answer: string }[] | null; meta_title: string | null; meta_description: string | null;
  };
  return {
    id: r.id, intent: r.intent, casinoSlug: c.slug, casinoName: c.name, featuredBonusId: r.featured_bonus_id,
    h1: r.h1, intro: r.intro, body: r.body, faq: r.faq ?? [], metaTitle: r.meta_title, metaDescription: r.meta_description,
  };
}

/** The live commercial offer, tagged "bonuses" (propagates on bonus edit). */
export async function getFeaturedBonus(id: string): Promise<FeaturedBonus | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("bonuses");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("bonuses")
    .select("slug, offer, free_spins, wagering, code, claim_url, min_deposit, validity, terms, is_no_deposit, is_no_wagering, status, expires_at, bonus_type:bonus_types(slug, label)")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(`getFeaturedBonus: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as {
    slug: string; offer: string; free_spins: number | null; wagering: string | null; code: string | null;
    claim_url: string | null; min_deposit: string | null; validity: string | null; terms: string[] | null;
    is_no_deposit: boolean; is_no_wagering: boolean; status: string; expires_at: string | null;
    bonus_type: { slug: string; label: string } | null;
  };
  return {
    slug: r.slug, offer: r.offer, freeSpins: r.free_spins, wagering: r.wagering, code: r.code, claimUrl: r.claim_url,
    minDeposit: r.min_deposit, validity: r.validity, terms: r.terms ?? [], bonusTypeLabel: r.bonus_type?.label ?? null,
    typeSlug: r.bonus_type?.slug ?? "", freeSpinsForMatch: r.free_spins, isNoDeposit: r.is_no_deposit, isNoWagering: r.is_no_wagering,
    status: r.status, expiresAt: r.expires_at,
  };
}

/** Per-request liveness: published AND not past its expiry date. `today` is the request date. */
export function isOfferLive(b: FeaturedBonus, today: string): boolean {
  return b.status === "published" && (!b.expiresAt || b.expiresAt >= today);
}

/** Published evergreen pages for the sitemap (tagged seo_bonus_pages). */
export async function listPublishedEvergreenPages(): Promise<{ casinoSlug: string; intent: string; updatedAt: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo_bonus_pages");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("seo_bonus_pages")
    .select("intent, updated_at, casino:casinos(slug, status)")
    .eq("status", "published");
  if (error) throw new Error(`listPublishedEvergreenPages: ${error.message}`);
  return ((data as unknown as { intent: string; updated_at: string; casino: { slug: string; status: string } | null }[]) ?? [])
    .filter((r) => r.casino?.status === "published") // operator must also be published
    .map((r) => ({ casinoSlug: r.casino!.slug, intent: r.intent, updatedAt: r.updated_at }));
}
