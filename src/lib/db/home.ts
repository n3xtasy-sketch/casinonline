import "server-only";
import { cacheLife, cacheTag } from "next/cache";
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
import type { RankedRow, GamePick } from "@/types/widget";

/* ---------- Homepage sections (full cards) ---------- */

/** Recommended casinos (top rated). */
export async function getHomeCasinos(): Promise<CasinoCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  return (await getCasinos()).slice(0, 4);
}

/** Popular games. */
export async function getHomeGames(): Promise<GameCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  return (await getGames()).slice(0, 8);
}

/** Latest bonuses. */
export async function getHomeBonuses(): Promise<BonusCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("bonuses");
  return (await getBonuses()).slice(0, 3);
}

/** Popular providers (most games first). */
export async function getHomeProviders(): Promise<ProviderCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("providers");
  return (await getProviders()).slice(0, 6);
}

/** Latest guides (shared by homepage section and sidebar widget). */
export async function getHomeGuides(): Promise<GuideCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("guides");
  return (await getGuides()).slice(0, 3);
}

/* ---------- Right-sidebar widgets ---------- */

/** Top casinos ranked by rating (star metric is the DB rating). */
export async function getTopCasinosRanked(): Promise<RankedRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("casinos");
  return (await getCasinos()).slice(0, 5).map((c) => ({ name: c.name, rating: c.rating }));
}

/**
 * Popular games (ordered by RTP). Games have no 0–5 rating in the schema, so
 * the widget shows name + provider only — no rating is presented.
 */
export async function getPopularGames(): Promise<GamePick[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  const games = await getGames();
  return [...games]
    .filter((g) => g.rtp != null)
    .sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0))
    .slice(0, 5)
    .map((g) => ({ name: g.name, provider: g.provider }));
}

/** Bonus of the day: prefer a welcome bonus, else the latest. */
export async function getBonusOfTheDay(): Promise<BonusCardData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("bonuses");
  const bonuses = await getBonuses();
  const welcome = bonuses.find((b) => b.typeSlug === "bonus-de-bun-venit");
  return welcome ?? bonuses[0] ?? null;
}
