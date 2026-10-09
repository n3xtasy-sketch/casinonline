import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
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
export async function getCasinos(limit?: number): Promise<CasinoCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  const db = getSupabaseServerClient();
  let query = db.from("casinos").select(CARD_SELECT).order("rating", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(`getCasinos: ${error.message}`);
  return (data as unknown as CasinoCardRow[]).map(toCard);
}

/** Other casinos for the "related" block (top-rated first), excluding one slug. */
export async function getRelatedCasinos(excludeSlug: string, limit = 3): Promise<CasinoCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("casinos")
    .select(CARD_SELECT)
    .neq("slug", excludeSlug)
    .order("rating", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRelatedCasinos: ${error.message}`);
  return (data as unknown as CasinoCardRow[]).map(toCard);
}

/** Single casino (detail) by slug, or null when not found. */
export async function getCasinoBySlug(slug: string): Promise<CasinoDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
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
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
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

/** Single casino card by slug (e.g. the casino that offers a bonus). */
export async function getCasinoCardBySlug(slug: string): Promise<CasinoCardData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("casinos")
    .select(CARD_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getCasinoCardBySlug: ${error.message}`);
  return data ? toCard(data as unknown as CasinoCardRow) : null;
}

/** Casinos that offer games from a given provider (via casino_games → games). */
export async function getCasinosForProvider(providerSlug: string): Promise<CasinoCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("providers")
    .select(`games(casinos(${CARD_SELECT}))`)
    .eq("slug", providerSlug)
    .maybeSingle();
  if (error) throw new Error(`getCasinosForProvider: ${error.message}`);
  const games =
    (data as unknown as { games: { casinos: CasinoCardRow[] | null }[] } | null)?.games ?? [];
  const bySlug = new Map<string, CasinoCardData>();
  for (const g of games) {
    for (const c of g.casinos ?? []) {
      if (!bySlug.has(c.slug)) bySlug.set(c.slug, toCard(c));
    }
  }
  return [...bySlug.values()];
}

/** Casinos that accept a given payment method (via casino_payment_methods). */
export async function getCasinosForPaymentMethod(paymentSlug: string): Promise<CasinoCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("payment_methods")
    .select(`casinos(${CARD_SELECT})`)
    .eq("slug", paymentSlug)
    .maybeSingle();
  if (error) throw new Error(`getCasinosForPaymentMethod: ${error.message}`);
  const casinos = (data as unknown as { casinos: CasinoCardRow[] } | null)?.casinos ?? [];
  return casinos.map(toCard);
}
