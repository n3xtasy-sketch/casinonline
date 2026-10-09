import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CasinoCardData, CasinoDetail, CasinoBadge } from "@/types/casino";

/** Maps a tag slug to a display badge tone (reconstructs the mock badge look). */
const TAG_TONE: Record<string, CasinoBadge["tone"]> = {
  recomandat: "accent",
  "retrageri-rapide": "info",
  nou: "info",
  "fara-depunere": "accent",
  popular: "gold",
};

interface TagRow {
  slug: string;
  label: string;
}
interface BonusMiniRow {
  offer: string;
  free_spins: number | null;
  bonus_type: { slug: string } | null;
}
interface CasinoCardRow {
  slug: string;
  name: string;
  logo_url: string | null;
  rating: number | null;
  license: string | null;
  payout_speed: string | null;
  verified_at: string | null;
  offer_url: string | null;
  tags: TagRow[] | null;
  bonuses: BonusMiniRow[] | null;
}
interface CasinoDetailRow extends CasinoCardRow {
  editor_score: number | null;
  intro: string | null;
  editor_review: string | null;
  pros: string[] | null;
  cons: string[] | null;
  faq: { question: string; answer: string }[] | null;
  min_deposit: string | null;
  withdrawal_time: string | null;
  kyc: string | null;
  support: string | null;
  mobile: string | null;
  payment_methods: { name: string }[] | null;
}

function pickBonus(bonuses: BonusMiniRow[] | null) {
  if (!bonuses || bonuses.length === 0) return undefined;
  const welcome = bonuses.find((b) => b.bonus_type?.slug === "bonus-de-bun-venit");
  const b = welcome ?? bonuses[0];
  return { headline: b.offer, freeSpins: b.free_spins ?? undefined };
}

function toCard(row: CasinoCardRow): CasinoCardData {
  const tagRows = row.tags ?? [];
  return {
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    rating: row.rating ?? 0,
    bonus: pickBonus(row.bonuses),
    license: row.license ?? undefined,
    payoutSpeed: row.payout_speed ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    badges: tagRows.map((t) => ({ label: t.label, tone: TAG_TONE[t.slug] ?? "neutral" })),
    tags: tagRows.map((t) => t.slug),
    reviewUrl: `/cazinouri-online/${row.slug}`,
    offerUrl: row.offer_url ?? "",
  };
}

function toDetail(row: CasinoDetailRow): CasinoDetail {
  return {
    ...toCard(row),
    intro: row.intro ?? "",
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    editorReview: row.editor_review ?? "",
    editorScore: row.editor_score ?? 0,
    minDeposit: row.min_deposit ?? undefined,
    withdrawalTime: row.withdrawal_time ?? undefined,
    kyc: row.kyc ?? undefined,
    support: row.support ?? undefined,
    mobile: row.mobile ?? undefined,
    paymentMethods: (row.payment_methods ?? []).map((p) => p.name),
    faq: row.faq ?? [],
  };
}

const CARD_SELECT =
  "slug, name, logo_url, rating, license, payout_speed, verified_at, offer_url, tags(slug, label), bonuses(offer, free_spins, bonus_type:bonus_types(slug))";

const DETAIL_SELECT = `${CARD_SELECT}, editor_score, intro, editor_review, pros, cons, faq, min_deposit, withdrawal_time, kyc, support, mobile, payment_methods(name)`;

/** All casinos for the listing (default order: highest rating first). */
export async function getCasinos(): Promise<CasinoCardData[]> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("casinos")
    .select(CARD_SELECT)
    .order("rating", { ascending: false });
  if (error) throw new Error(`getCasinos: ${error.message}`);
  return (data as unknown as CasinoCardRow[]).map(toCard);
}

/** Single casino (detail) by slug, or null when not found. */
export async function getCasinoBySlug(slug: string): Promise<CasinoDetail | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("casinos")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getCasinoBySlug: ${error.message}`);
  return data ? toDetail(data as unknown as CasinoDetailRow) : null;
}

/** Casinos that offer a given game (via the casino_games relation). */
export async function getCasinosForGame(gameSlug: string): Promise<CasinoCardData[]> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("games")
    .select(`casinos(${CARD_SELECT})`)
    .eq("slug", gameSlug)
    .maybeSingle();
  if (error) throw new Error(`getCasinosForGame: ${error.message}`);
  const casinos = (data as unknown as { casinos: CasinoCardRow[] } | null)?.casinos ?? [];
  return casinos.map(toCard);
}
