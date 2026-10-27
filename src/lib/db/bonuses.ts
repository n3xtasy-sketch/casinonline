import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import type { BonusCardData, BonusDetail } from "@/types/bonus";

interface BonusRow {
  slug: string;
  offer: string;
  free_spins: number | null;
  wagering: string | null;
  code: string | null;
  claim_url: string | null;
  bonus_type: { slug: string; label: string } | null;
  casino: { slug: string; name: string } | null;
}

interface BonusDetailRow extends BonusRow {
  intro: string | null;
  min_deposit: string | null;
  validity: string | null;
  terms: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  how_to_claim: string[] | null;
  faq: { question: string; answer: string }[] | null;
  author_slug: string | null;
  verifier_slug: string | null;
  editorial_verified_at: string | null;
  updated_at: string | null;
}

function toCard(row: BonusRow): BonusCardData {
  return {
    slug: row.slug,
    typeSlug: row.bonus_type?.slug ?? "",
    bonusType: row.bonus_type?.label ?? "",
    casinoName: row.casino?.name ?? "",
    casinoSlug: row.casino?.slug ?? "",
    offer: row.offer,
    freeSpins: row.free_spins ?? undefined,
    wagering: row.wagering ?? undefined,
    code: row.code ?? undefined,
    href: `/bonusuri-casino/${row.slug}`,
    claimUrl: row.claim_url ?? "",
  };
}

function toDetail(row: BonusDetailRow): BonusDetail {
  return {
    ...toCard(row),
    intro: row.intro ?? "",
    minDeposit: row.min_deposit ?? undefined,
    validity: row.validity ?? undefined,
    terms: row.terms ?? [],
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    howToClaim: row.how_to_claim ?? [],
    faq: row.faq ?? [],
    editorial: {
      authorSlug: row.author_slug ?? null,
      verifierSlug: row.verifier_slug ?? null,
      editorialVerifiedAt: row.editorial_verified_at ?? null,
      updatedAt: row.updated_at ?? null,
    },
  };
}

const CARD_SELECT =
  "slug, offer, free_spins, wagering, code, claim_url, bonus_type:bonus_types(slug, label), casino:casinos(slug, name)";

const DETAIL_SELECT = `${CARD_SELECT}, intro, min_deposit, validity, terms, pros, cons, how_to_claim, faq, author_slug, verifier_slug, editorial_verified_at, updated_at`;

/** All bonuses for the listing (the page applies filter/sort). */
export async function getBonuses(): Promise<BonusCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("bonuses");
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("bonuses").select(CARD_SELECT).order("created_at");
  if (error) throw new Error(`getBonuses: ${error.message}`);
  // Drop bonuses whose casino is not publicly visible (archived → RLS nulls the
  // embed). Keeps dead-CTA bonuses out of listings/homepage/sidebar.
  return (data as unknown as BonusRow[]).filter((r) => r.casino).map(toCard);
}

/**
 * Similar bonuses (same type, excluding one), falling back to any other bonus.
 * Reuses the cached full list (created_at timestamps are tied, so a LIMIT query
 * would reorder ties vs the current slice behaviour — output must stay stable).
 */
export async function getSimilarBonuses(
  typeSlug: string,
  excludeSlug: string,
  limit = 3,
): Promise<BonusCardData[]> {
  const all = await getBonuses();
  const sameType = all.filter((b) => b.typeSlug === typeSlug && b.slug !== excludeSlug);
  return (sameType.length ? sameType : all.filter((b) => b.slug !== excludeSlug)).slice(0, limit);
}

/** Bonus of the day: a welcome bonus if any, else the earliest-seeded bonus. */
export async function getFeaturedBonus(): Promise<BonusCardData | null> {
  const all = await getBonuses();
  return all.find((b) => b.typeSlug === "bonus-de-bun-venit") ?? all[0] ?? null;
}

/** Single bonus (detail) by slug, or null when not found. */
export async function getBonusBySlug(slug: string): Promise<BonusDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("bonuses");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("bonuses")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getBonusBySlug: ${error.message}`);
  // Archived casino → RLS nulls the embed → treat the bonus as not found so the
  // detail page 404s (not just hidden from listings).
  const row = data as unknown as BonusDetailRow | null;
  return row && row.casino ? toDetail(row) : null;
}
