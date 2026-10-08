import type { Metadata } from "next";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { SortSelect } from "@/components/filters/SortSelect";
import { allProviders, providerSortOptions } from "@/data/providers";
import type { ProviderCardData } from "@/types/provider";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Furnizori de jocuri de cazino",
  description:
    "Descoperă furnizorii de jocuri de cazino disponibili în România — Pragmatic Play, EGT, Play'n GO și alții — cu cele mai populare sloturi ale fiecăruia.",
  alternates: { canonical: "/furnizori" },
};

// Query-dependent listing: render per request (full list in HTML for SEO).
export const instant = false;

const DEFAULT_SORT = "recomandate";

function sortProviders(list: ProviderCardData[], sort: string): ProviderCardData[] {
  const arr = [...list];
  if (sort === "nume") arr.sort((a, b) => a.name.localeCompare(b.name, "ro"));
  else if (sort === "jocuri") arr.sort((a, b) => b.gameCount - a.gameCount);
  return arr; // "recomandate" keeps the curated order
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProviderListingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const sort = typeof sp.sort === "string" ? sp.sort : DEFAULT_SORT;
  const providers = sortProviders(allProviders, sort);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={itemListSchema(providers.map((p) => p.href))} />
      <header>
        <h1 className="text-3xl font-bold text-ink md:text-4xl">Furnizori de jocuri</h1>
        <p className="mt-2 max-w-[70ch] text-ink-secondary">
          Studiourile care dezvoltă sloturile și jocurile din cazinourile online din România.
          Explorează fiecare furnizor și cele mai populare jocuri ale sale.
        </p>
      </header>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          {providers.length} {providers.length === 1 ? "furnizor" : "furnizori"}
        </p>
        <SortSelect options={providerSortOptions} defaultValue={DEFAULT_SORT} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.slug} provider={provider} />
        ))}
      </div>
    </div>
  );
}
