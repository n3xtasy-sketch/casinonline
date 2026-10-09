import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { BonusCard } from "@/components/bonuses/BonusCard";
import { FilterChips } from "@/components/filters/FilterChips";
import { SortSelect } from "@/components/filters/SortSelect";
import { bonusTypeFilters, bonusSortOptions } from "@/data/bonuses";
import { getBonuses } from "@/lib/db/bonuses";
import type { BonusCardData } from "@/types/bonus";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Bonusuri de cazino",
  description:
    "Compară cele mai bune bonusuri de cazino din România: bonus de bun venit, fără depunere, rotiri gratuite, cashback și fără rulaj. Filtrează după tip și sortează.",
  alternates: { canonical: "/bonusuri-casino" },
  openGraph: {
    title: "Bonusuri de cazino",
    description:
      "Compară cele mai bune bonusuri de cazino din România: bonus de bun venit, fără depunere, rotiri gratuite, cashback și fără rulaj. Filtrează după tip și sortează.",
    type: "website",
    siteName: "CasinOnline.ro",
    url: "/bonusuri-casino",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
    title: "Bonusuri de cazino",
    description:
      "Compară cele mai bune bonusuri de cazino din România: bonus de bun venit, fără depunere, rotiri gratuite, cashback și fără rulaj. Filtrează după tip și sortează.",
  },
};

// Query-dependent listing: render per request (full list in HTML for SEO).
export const instant = false;

const DEFAULT_SORT = "recomandate";

function sortBonuses(list: BonusCardData[], sort: string): BonusCardData[] {
  const arr = [...list];
  if (sort === "rotiri") arr.sort((a, b) => (b.freeSpins ?? 0) - (a.freeSpins ?? 0));
  else if (sort === "cazino") arr.sort((a, b) => a.casinoName.localeCompare(b.casinoName, "ro"));
  return arr; // "recomandate" keeps the curated order
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BonusListingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tip = typeof sp.tip === "string" ? sp.tip : "";
  const sort = typeof sp.sort === "string" ? sp.sort : DEFAULT_SORT;

  const all = await getBonuses();
  const filtered = tip ? all.filter((b) => b.typeSlug === tip) : all;
  const bonuses = sortBonuses(filtered, sort);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={itemListSchema(bonuses.map((b) => ({ name: `${b.bonusType} — ${b.casinoName}`, url: b.href })))} />
      <header>
        <h1 className="text-3xl font-bold text-ink md:text-4xl">Bonusuri de cazino</h1>
        <p className="mt-2 max-w-[70ch] text-ink-secondary">
          Cele mai bune oferte de bonus de la cazinourile online licențiate ONJN. Filtrează
          după tipul de bonus și găsește oferta potrivită pentru tine.
        </p>
      </header>

      <FilterChips param="tip" label="Tip bonus" options={bonusTypeFilters} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          {bonuses.length} {bonuses.length === 1 ? "bonus" : "bonusuri"}
        </p>
        <SortSelect options={bonusSortOptions} defaultValue={DEFAULT_SORT} />
      </div>

      {bonuses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bonuses.map((bonus) => (
            <BonusCard key={bonus.slug} bonus={bonus} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-8">
          <p className="text-ink-secondary">Nu am găsit bonusuri pentru filtrul selectat.</p>
          <Button variant="secondary" href="/bonusuri-casino">
            Resetează filtrele
          </Button>
        </div>
      )}
    </div>
  );
}
