import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { FilterChips } from "@/components/filters/FilterChips";
import { SortSelect } from "@/components/filters/SortSelect";
import { casinoFilterTags, casinoSortOptions } from "@/data/casinos";
import { getCasinos } from "@/lib/db/casinos";
import type { CasinoCardData } from "@/types/casino";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Cazinouri online",
  description:
    "Compară cele mai bune cazinouri online licențiate ONJN din România: bonusuri, rating, viteză de retragere și metode de plată.",
  alternates: { canonical: "/cazinouri-online" },
  openGraph: {
    title: "Cazinouri online",
    description:
      "Compară cele mai bune cazinouri online licențiate ONJN din România: bonusuri, rating, viteză de retragere și metode de plată.",
    type: "website",
    siteName: "CasinOnline.ro",
    url: "/cazinouri-online",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
    title: "Cazinouri online",
    description:
      "Compară cele mai bune cazinouri online licențiate ONJN din România: bonusuri, rating, viteză de retragere și metode de plată.",
  },
};

// Query-dependent listing: render per request (full list in HTML for SEO)
// instead of prerendering a static shell. Required by Next's Cache Components.
export const instant = false;

const DEFAULT_SORT = "recomandate";

function sortCasinos(list: CasinoCardData[], sort: string): CasinoCardData[] {
  const arr = [...list];
  if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
  else if (sort === "nume") arr.sort((a, b) => a.name.localeCompare(b.name, "ro"));
  return arr; // "recomandate" keeps the curated order
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CasinoListingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const sort = typeof sp.sort === "string" ? sp.sort : DEFAULT_SORT;

  const all = await getCasinos();
  const filtered = tag ? all.filter((c) => c.tags?.includes(tag)) : all;
  const casinos = sortCasinos(filtered, sort);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={itemListSchema(casinos.map((c) => ({ name: c.name, url: c.reviewUrl })))} />
      <header>
        <h1 className="text-3xl font-bold text-ink md:text-4xl">Cazinouri online</h1>
        <p className="mt-2 max-w-[70ch] text-ink-secondary">
          Compară cazinourile online licențiate ONJN din România — bonusuri, rating,
          viteză de retragere și metode de plată, verificate de echipa noastră.
        </p>
      </header>

      <h2 className="sr-only">Listă cazinouri</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips param="tag" options={casinoFilterTags} />
        <SortSelect options={casinoSortOptions} defaultValue={DEFAULT_SORT} />
      </div>

      <p className="text-sm text-ink-muted">
        {casinos.length}{" "}
        {casinos.length === 1 ? "cazinou" : "cazinouri"}
      </p>

      {casinos.length ? (
        <div className="flex flex-col gap-4">
          {casinos.map((casino) => (
            <CasinoCard key={casino.slug} casino={casino} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-8">
          <p className="text-ink-secondary">
            Nu am găsit cazinouri pentru filtrele selectate.
          </p>
          <Button variant="secondary" href="/cazinouri-online">
            Resetează filtrele
          </Button>
        </div>
      )}
    </div>
  );
}
