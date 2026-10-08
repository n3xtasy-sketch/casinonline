import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { GuideCard } from "@/components/guides/GuideCard";
import { FilterChips } from "@/components/filters/FilterChips";
import { SortSelect } from "@/components/filters/SortSelect";
import { allGuides, guideCategoryFilters, guideSortOptions } from "@/data/guides";
import type { GuideCardData } from "@/types/guide";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Ghiduri de cazino",
  description:
    "Ghiduri și articole despre cazinouri online, bonusuri, jocuri și metode de plată. Învață cum funcționează rulajul, RTP-ul, verificarea KYC și multe altele.",
  alternates: { canonical: "/ghiduri" },
};

// Query-dependent listing: render per request (full list in HTML for SEO).
export const instant = false;

const DEFAULT_SORT = "recomandate";

function sortGuides(list: GuideCardData[], sort: string): GuideCardData[] {
  const arr = [...list];
  if (sort === "titlu") arr.sort((a, b) => a.title.localeCompare(b.title, "ro"));
  return arr; // "recomandate" keeps the curated order
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GuideListingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const categorie = typeof sp.categorie === "string" ? sp.categorie : "";
  const sort = typeof sp.sort === "string" ? sp.sort : DEFAULT_SORT;

  const filtered = categorie
    ? allGuides.filter((g) => g.categorySlug === categorie)
    : allGuides;
  const guides = sortGuides(filtered, sort);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={itemListSchema(guides.map((g) => g.href))} />
      <header>
        <h1 className="text-3xl font-bold text-ink md:text-4xl">Ghiduri de cazino</h1>
        <p className="mt-2 max-w-[70ch] text-ink-secondary">
          Articole și ghiduri scrise pe înțelesul tuturor despre cazinouri, bonusuri, jocuri
          și metode de plată. Filtrează după categorie.
        </p>
      </header>

      <FilterChips param="categorie" label="Categorie" options={guideCategoryFilters} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          {guides.length} {guides.length === 1 ? "ghid" : "ghiduri"}
        </p>
        <SortSelect options={guideSortOptions} defaultValue={DEFAULT_SORT} />
      </div>

      {guides.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-8">
          <p className="text-ink-secondary">Nu am găsit ghiduri pentru categoria selectată.</p>
          <Button variant="secondary" href="/ghiduri">
            Resetează filtrele
          </Button>
        </div>
      )}
    </div>
  );
}
