import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqPageSchema } from "@/lib/schema";
import { intentLabel } from "@/lib/evergreen-bonus";
import type { EvergreenPage, FeaturedBonus } from "@/lib/db/seo-bonus-pages";

export function evergreenPath(operatorSlug: string, intent: string): string {
  return `/cazinouri-online/${operatorSlug}/${intent}`;
}

/** Metadata: self-canonical, individual title/description. */
export function evergreenMetadata(page: EvergreenPage): Metadata {
  const url = evergreenPath(page.casinoSlug, page.intent);
  const fallback = `${intentLabel(page.intent) ?? "Bonus"} ${page.casinoName}`;
  const title = page.metaTitle || fallback;
  const description = page.metaDescription || page.intro || fallback;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", siteName: "CasinOnline.ro", url, images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

/**
 * Evergreen operator bonus page. Editorial is stable (from seo_bonus_pages); the commercial
 * offer is live (from bonuses). `isLive` is decided per-request by the caller — when false we
 * render the editorial but NO claim CTA and never present the offer as active.
 */
export function EvergreenBonusPage({
  page,
  featured,
  isLive,
}: {
  page: EvergreenPage;
  featured: FeaturedBonus | null;
  isLive: boolean;
}) {
  const label = intentLabel(page.intent) ?? "Bonus";
  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Cazinouri", href: "/cazinouri-online" },
    { label: page.casinoName, href: `/cazinouri-online/${page.casinoSlug}` },
    { label },
  ];

  return (
    <article className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {page.faq.length ? <JsonLd data={faqPageSchema(page.faq)} /> : null}
      <Breadcrumbs items={crumbs} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink md:text-4xl">{page.h1 || `${label} ${page.casinoName}`}</h1>
        {page.intro ? <p className="max-w-[72ch] whitespace-pre-line text-lg leading-relaxed text-ink-secondary">{page.intro}</p> : null}
      </header>

      {/* Featured offer — commercial data straight from `bonuses`; CTA only when live. */}
      {featured && isLive ? (
        <section className="flex flex-col gap-3 rounded-md border border-accent/40 bg-accent/5 p-5">
          <p className="text-xl font-semibold text-ink">{featured.offer}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-secondary">
            {featured.freeSpins ? <span>Rotiri gratuite: <strong className="text-ink">{featured.freeSpins}</strong></span> : null}
            {featured.wagering ? <span>Rulaj: <strong className="text-ink">{featured.wagering}</strong></span> : null}
            {featured.minDeposit ? <span>Depunere minimă: <strong className="text-ink">{featured.minDeposit}</strong></span> : null}
            {featured.validity ? <span>Valabilitate: <strong className="text-ink">{featured.validity}</strong></span> : null}
            {featured.code ? <span>Cod: <strong className="text-ink">{featured.code}</strong></span> : null}
          </div>
          {featured.claimUrl ? (
            <div><Button href={featured.claimUrl}>Revendică bonusul</Button></div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-md border border-border bg-surface p-5 text-sm text-ink-secondary">
          Momentan nu există o ofertă activă pentru {page.casinoName} la această categorie. Revino mai târziu sau vezi
          alte oferte în <a href={`/cazinouri-online/${page.casinoSlug}`} className="text-link hover:underline">pagina {page.casinoName}</a>.
        </section>
      )}

      {/* Bonus conditions — only when live (they describe the current offer). */}
      {featured && isLive && featured.terms.length ? (
        <section className="flex flex-col gap-2">
          <SectionHeader title="Condiții bonus" />
          <ul className="flex flex-col gap-1 text-sm text-ink-secondary">
            {featured.terms.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </section>
      ) : null}

      {/* Editorial guide/body — stable regardless of offer lifecycle. */}
      {page.body ? (
        <section className="prose prose-invert max-w-[72ch] whitespace-pre-line text-ink-secondary">{page.body}</section>
      ) : null}

      {page.faq.length ? (
        <section>
          <SectionHeader title="Întrebări frecvente" />
          <FAQAccordion items={page.faq} />
        </section>
      ) : null}
    </article>
  );
}
