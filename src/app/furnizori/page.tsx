import type { Metadata } from "next";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { SortSelect } from "@/components/filters/SortSelect";
import { providerSortOptions } from "@/data/providers";
import { getProviders } from "@/lib/db/providers";
import type { ProviderCardData } from "@/types/provider";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Furnizori de jocuri de cazino",
  description:
    "Descoperă furnizorii de jocuri de cazino disponibili în România — Pragmatic Play, EGT, Play'n GO și alții — cu cele mai populare sloturi ale fiecăruia.",
  alternates: { canonical: "/furnizori" },
  openGraph: {
    title: "Furnizori de jocuri de cazino",
    description:
      "Descoperă furnizorii de jocuri de cazino disponibili în România — Pragmatic Play, EGT, Play'n GO și alții — cu cele mai populare sloturi ale fiecăruia.",
    type: "website",
    siteName: "CasinOnline.ro",
    url: "/furnizori",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
    title: "Furnizori de jocuri de cazino",
    description:
      "Descoperă furnizorii de jocuri de cazino disponibili în România — Pragmatic Play, EGT, Play'n GO și alții — cu cele mai populare sloturi ale fiecăruia.",
  },
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
  const providers = sortProviders(await getProviders(), sort);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={itemListSchema(providers.map((p) => ({ name: p.name, url: p.href })))} />
      <header>
        <h1 className="text-3xl font-bold text-ink md:text-4xl">Furnizori de jocuri</h1>
        <p className="mt-2 max-w-[70ch] text-ink-secondary">
          Studiourile care dezvoltă sloturile și jocurile din cazinourile online din România.
          Explorează fiecare furnizor și cele mai populare jocuri ale sale.
        </p>
      </header>

      <h2 className="sr-only">Listă furnizori</h2>

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
