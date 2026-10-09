import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCasinos } from "./casinos";
import { getGames } from "./games";
import { getBonuses, getFeaturedBonus } from "./bonuses";
import { getProviders } from "./providers";
import { getGuides } from "./guides";
import type { CasinoCardData } from "@/types/casino";
import type { GameCardData } from "@/types/game";
import type { BonusCardData } from "@/types/bonus";
import type { ProviderCardData } from "@/types/provider";
import type { GuideCardData } from "@/types/guide";
import type { RankedRow, GamePick } from "@/types/widget";

/* ---------- Homepage sections (full cards, limited in-query) ---------- */

/** Recommended casinos (top 4 by rating). */
export async function getHomeCasinos(): Promise<CasinoCardData[]> {
  return getCasinos(4);
}

/** Popular games (first 8). */
export async function getHomeGames(): Promise<GameCardData[]> {
  return getGames(8);
}

/** Latest bonuses (first 3). created_at ties → slice the cached list to keep order stable. */
export async function getHomeBonuses(): Promise<BonusCardData[]> {
  return (await getBonuses()).slice(0, 3);
}

/** Popular providers (top 6 by game count). */
export async function getHomeProviders(): Promise<ProviderCardData[]> {
  return getProviders(6);
}

/** Latest guides (first 3). created_at ties → slice the cached list to keep order stable. */
export async function getHomeGuides(): Promise<GuideCardData[]> {
  return (await getGuides()).slice(0, 3);
}

/* ---------- Right-sidebar widgets (lightweight selects) ---------- */

/** Top 5 casinos ranked by rating — only name + rating are fetched. */
export async function getTopCasinosRanked(): Promise<RankedRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("casinos")
    .select("name, rating")
    .order("rating", { ascending: false })
    .limit(5);
  if (error) throw new Error(`getTopCasinosRanked: ${error.message}`);
  return (data as unknown as { name: string; rating: number | null }[]).map((c) => ({
    name: c.name,
    rating: c.rating ?? 0,
  }));
}

/**
 * Top 5 games by RTP — only name + provider are fetched. Games have no 0–5
 * rating in the schema, so the widget shows name + provider (no rating).
 */
export async function getPopularGames(): Promise<GamePick[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("games")
    .select("name, provider:providers(name)")
    .not("rtp", "is", null)
    .order("rtp", { ascending: false })
    .order("name")
    .limit(5);
  if (error) throw new Error(`getPopularGames: ${error.message}`);
  return (data as unknown as { name: string; provider: { name: string } | null }[]).map((g) => ({
    name: g.name,
    provider: g.provider?.name ?? "",
  }));
}

/** Bonus of the day (delegates to the dedicated featured-bonus query). */
export async function getBonusOfTheDay(): Promise<BonusCardData | null> {
  return getFeaturedBonus();
}
