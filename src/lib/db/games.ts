import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import type { GameCardData, GameDetail, GameVolatility } from "@/types/game";

/** Embedded relations come back as objects (to-one) or null. */
interface GameRow {
  slug: string;
  name: string;
  thumbnail_url: string | null;
  rtp: number | null;
  volatility: GameVolatility | null;
  provider: { slug: string; name: string } | null;
  category: { slug: string } | null;
}

interface GameDetailRow extends GameRow {
  intro: string | null;
  max_win: string | null;
  release_year: number | null;
  reels: string | null;
  paylines: string | null;
  bet_range: string | null;
  mechanics: string | null;
  bonus_features: string[] | null;
  faq: { question: string; answer: string }[] | null;
}

function toCard(row: GameRow): GameCardData {
  return {
    slug: row.slug,
    name: row.name,
    provider: row.provider?.name ?? "",
    providerSlug: row.provider?.slug ?? "",
    categorySlug: row.category?.slug ?? "",
    thumbnailUrl: row.thumbnail_url ?? undefined,
    rtp: row.rtp ?? undefined,
    volatility: row.volatility ?? undefined,
    href: `/jocuri-casino/${row.slug}`,
  };
}

function toDetail(row: GameDetailRow): GameDetail {
  return {
    ...toCard(row),
    intro: row.intro ?? "",
    maxWin: row.max_win ?? undefined,
    releaseDate: row.release_year != null ? String(row.release_year) : undefined,
    reels: row.reels ?? undefined,
    paylines: row.paylines ?? undefined,
    betRange: row.bet_range ?? undefined,
    mechanics: row.mechanics ?? "",
    bonusFeatures: row.bonus_features ?? [],
    faq: row.faq ?? [],
    // availableCasinos intentionally omitted: game → casinos stays on mock
    // until the Casinos module is connected.
  };
}

const CARD_COLUMNS =
  "slug, name, thumbnail_url, rtp, volatility, provider:providers(slug, name), category:game_categories(slug)";

const DETAIL_COLUMNS = `${CARD_COLUMNS}, intro, max_win, release_year, reels, paylines, bet_range, mechanics, bonus_features, faq`;

/** All games for the listing (the page applies filters/sorting on the result). */
export async function getGames(limit?: number): Promise<GameCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  const db = getSupabaseServerClient();
  let query = db.from("games").select(CARD_COLUMNS).order("name");
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(`getGames: ${error.message}`);
  return (data as unknown as GameRow[]).map(toCard);
}

const CARD_COLUMNS_FOR_PROVIDER =
  "slug, name, thumbnail_url, rtp, volatility, provider:providers!inner(slug, name), category:game_categories(slug)";

/** Games belonging to a provider (via games.provider_id). */
export async function getGamesForProvider(providerSlug: string): Promise<GameCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("games")
    .select(CARD_COLUMNS_FOR_PROVIDER)
    .eq("provider.slug", providerSlug)
    .order("name");
  if (error) throw new Error(`getGamesForProvider: ${error.message}`);
  return (data as unknown as GameRow[]).map(toCard);
}

/** Single game (detail) by slug, or null when not found. */
export async function getGameBySlug(slug: string): Promise<GameDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("games")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getGameBySlug: ${error.message}`);
  return data ? toDetail(data as unknown as GameDetailRow) : null;
}
