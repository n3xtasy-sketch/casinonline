import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { FilterChips } from "@/components/filters/FilterChips";
import { SortSelect } from "@/components/filters/SortSelect";
import { paymentTypeFilters, paymentSortOptions } from "@/data/payments";
import { getPaymentMethods } from "@/lib/db/payments";
import type { PaymentMethodCardData } from "@/types/payment";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Metode de plată pentru cazinouri",
  description:
    "Compară metodele de plată acceptate de cazinourile online din România — carduri, portofele electronice, plăți mobile și preplătite: viteză, comisioane și limite.",
  alternates: { canonical: "/metode-de-plata" },
  openGraph: {
    title: "Metode de plată pentru cazinouri",
    description:
      "Compară metodele de plată acceptate de cazinourile online din România — carduri, portofele electronice, plăți mobile și preplătite: viteză, comisioane și limite.",
    type: "website",
    siteName: "CasinOnline.ro",
    url: "/metode-de-plata",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
    title: "Metode de plată pentru cazinouri",
    description:
      "Compară metodele de plată acceptate de cazinourile online din România — carduri, portofele electronice, plăți mobile și preplătite: viteză, comisioane și limite.",
  },
};

// Query-dependent listing: render per request (full list in HTML for SEO).
export const instant = false;

const DEFAULT_SORT = "recomandate";

function sortMethods(list: PaymentMethodCardData[], sort: string): PaymentMethodCardData[] {
  const arr = [...list];
  if (sort === "nume") arr.sort((a, b) => a.name.localeCompare(b.name, "ro"));
  return arr; // "recomandate" keeps the curated order
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PaymentListingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tip = typeof sp.tip === "string" ? sp.tip : "";
  const sort = typeof sp.sort === "string" ? sp.sort : DEFAULT_SORT;

  const all = await getPaymentMethods();
  const filtered = tip ? all.filter((m) => m.typeSlug === tip) : all;
  const methods = sortMethods(filtered, sort);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={itemListSchema(methods.map((m) => ({ name: m.name, url: m.href })))} />
      <header>
        <h1 className="text-3xl font-bold text-ink md:text-4xl">Metode de plată</h1>
        <p className="mt-2 max-w-[70ch] text-ink-secondary">
          Metodele de plată acceptate la cazinourile online din România. Filtrează după tip
          și află viteza, comisioanele și limitele fiecăreia.
        </p>
      </header>

      <FilterChips param="tip" label="Tip" options={paymentTypeFilters} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          {methods.length} {methods.length === 1 ? "metodă" : "metode"}
        </p>
        <SortSelect options={paymentSortOptions} defaultValue={DEFAULT_SORT} />
      </div>

      {methods.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {methods.map((method) => (
            <PaymentMethodCard key={method.slug} method={method} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-8">
          <p className="text-ink-secondary">Nu am găsit metode de plată pentru filtrul selectat.</p>
          <Button variant="secondary" href="/metode-de-plata">
            Resetează filtrele
          </Button>
        </div>
      )}
    </div>
  );
}
