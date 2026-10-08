import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/games/GameCard";
import { FilterChips } from "@/components/filters/FilterChips";
import { SortSelect } from "@/components/filters/SortSelect";
import {
  allGames,
  gameProviderFilters,
  gameCategoryFilters,
  gameVolatilityFilters,
  gameSortOptions,
  volatilityByValue,
} from "@/data/games";
import type { GameCardData } from "@/types/game";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Jocuri de cazino",
  description:
    "Descoperă sloturi și jocuri de cazino: filtrează după furnizor, categorie și volatilitate, sortează după RTP și găsește-ți jocul preferat.",
  alternates: { canonical: "/jocuri-casino" },
};

// Query-dependent listing: render per request (full list in HTML for SEO).
export const instant = false;

const DEFAULT_SORT = "populare";

function sortGames(list: GameCardData[], sort: string): GameCardData[] {
  const arr = [...list];
  if (sort === "rtp") arr.sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0));
  else if (sort === "nume") arr.sort((a, b) => a.name.localeCompare(b.name, "ro"));
  return arr; // "populare" keeps the curated order
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GameListingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const furnizor = typeof sp.furnizor === "string" ? sp.furnizor : "";
  const categorie = typeof sp.categorie === "string" ? sp.categorie : "";
  const volatilitate = typeof sp.volatilitate === "string" ? sp.volatilitate : "";
  const sort = typeof sp.sort === "string" ? sp.sort : DEFAULT_SORT;

  let filtered = allGames;
  if (furnizor) filtered = filtered.filter((g) => g.providerSlug === furnizor);
  if (categorie) filtered = filtered.filter((g) => g.categorySlug === categorie);
  if (volatilitate && volatilityByValue[volatilitate]) {
    filtered = filtered.filter((g) => g.volatility === volatilityByValue[volatilitate]);
  }
  const games = sortGames(filtered, sort);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={itemListSchema(games.map((g) => g.href))} />
      <header>
        <h1 className="text-3xl font-bold text-ink md:text-4xl">Jocuri de cazino</h1>
        <p className="mt-2 max-w-[70ch] text-ink-secondary">
          Explorează sloturile și jocurile populare din România. Filtrează după furnizor,
          categorie și volatilitate, apoi sortează după RTP.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <FilterChips param="furnizor" label="Furnizor" options={gameProviderFilters} />
        <FilterChips param="categorie" label="Categorie" options={gameCategoryFilters} />
        <FilterChips param="volatilitate" label="Volatilitate" options={gameVolatilityFilters} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          {games.length} {games.length === 1 ? "joc" : "jocuri"}
        </p>
        <SortSelect options={gameSortOptions} defaultValue={DEFAULT_SORT} />
      </div>

      {games.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-8">
          <p className="text-ink-secondary">Nu am găsit jocuri pentru filtrele selectate.</p>
          <Button variant="secondary" href="/jocuri-casino">
            Resetează filtrele
          </Button>
        </div>
      )}
    </div>
  );
}
