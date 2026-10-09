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
  };
}

const CARD_SELECT =
  "slug, offer, free_spins, wagering, code, claim_url, bonus_type:bonus_types(slug, label), casino:casinos(slug, name)";

const DETAIL_SELECT = `${CARD_SELECT}, intro, min_deposit, validity, terms, pros, cons, how_to_claim, faq`;

/** All bonuses for the listing (the page applies filter/sort). */
export async function getBonuses(): Promise<BonusCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("bonuses");
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("bonuses").select(CARD_SELECT).order("created_at");
  if (error) throw new Error(`getBonuses: ${error.message}`);
  return (data as unknown as BonusRow[]).map(toCard);
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
  return data ? toDetail(data as unknown as BonusDetailRow) : null;
}
