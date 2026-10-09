import "server-only";
import { getCasinos } from "./casinos";
import { getGames } from "./games";
import { getBonuses } from "./bonuses";
import { getProviders } from "./providers";
import { getGuides } from "./guides";
import type { CasinoCardData } from "@/types/casino";
import type { GameCardData } from "@/types/game";
import type { BonusCardData } from "@/types/bonus";
import type { ProviderCardData } from "@/types/provider";
import type { GuideCardData } from "@/types/guide";

/** Compact {name, rating} row for the right-sidebar ranked widgets. */
export interface RankedRowData {
  name: string;
  rating: number;
}

/* ---------- Homepage sections (full cards) ---------- */

/** Recommended casinos (top rated). */
export async function getHomeCasinos(): Promise<CasinoCardData[]> {
  return (await getCasinos()).slice(0, 4);
}

/** Popular games. */
export async function getHomeGames(): Promise<GameCardData[]> {
  return (await getGames()).slice(0, 8);
}

/** Latest bonuses. */
export async function getHomeBonuses(): Promise<BonusCardData[]> {
  return (await getBonuses()).slice(0, 3);
}

/** Popular providers (most games first). */
export async function getHomeProviders(): Promise<ProviderCardData[]> {
  return (await getProviders()).slice(0, 6);
}

/** Latest guides (shared by homepage section and sidebar widget). */
export async function getHomeGuides(): Promise<GuideCardData[]> {
  return (await getGuides()).slice(0, 3);
}

/* ---------- Right-sidebar widgets ---------- */

/** Top casinos ranked by rating (star metric is the DB rating). */
export async function getTopCasinosRanked(): Promise<RankedRowData[]> {
  return (await getCasinos()).slice(0, 5).map((c) => ({ name: c.name, rating: c.rating }));
}

/**
 * Popular games ranked by RTP. Games have no 0–5 rating in the schema, so the
 * star value is derived from RTP (rtp / 20 → ~4.8 for 96%), capped at 5.
 */
export async function getPopularGamesRanked(): Promise<RankedRowData[]> {
  const games = await getGames();
  return [...games]
    .filter((g) => g.rtp != null)
    .sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0))
    .slice(0, 5)
    .map((g) => ({ name: g.name, rating: Math.min(5, (g.rtp ?? 0) / 20) }));
}

/** Bonus of the day: prefer a welcome bonus, else the latest. */
export async function getBonusOfTheDay(): Promise<BonusCardData | null> {
  const bonuses = await getBonuses();
  const welcome = bonuses.find((b) => b.typeSlug === "bonus-de-bun-venit");
  return welcome ?? bonuses[0] ?? null;
}
