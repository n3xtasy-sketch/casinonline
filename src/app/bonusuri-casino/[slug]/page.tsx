import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqPageSchema } from "@/lib/schema";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { ProsCons } from "@/components/casino/ProsCons";
import { BonusCard } from "@/components/bonuses/BonusCard";
import { BonusDetailHeader } from "@/components/bonuses/BonusDetailHeader";
import { BonusFacts } from "@/components/bonuses/BonusFacts";
import { getBonusBySlug, getSimilarBonuses } from "@/lib/db/bonuses";
import { getCasinoCardBySlug } from "@/lib/db/casinos";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// DB-backed detail: render per request (no build-time DB dependency).
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bonus = await getBonusBySlug(slug);
  if (!bonus) return {};
  const title = `${bonus.bonusType} ${bonus.casinoName}`;
  const description = bonus.intro;
  const url = `/bonusuri-casino/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "CasinOnline.ro", title, description, url, images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default async function BonusDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const bonus = await getBonusBySlug(slug);
  if (!bonus) notFound();

  const casino = await getCasinoCardBySlug(bonus.casinoSlug);

  const similar = await getSimilarBonuses(bonus.typeSlug, slug);

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Bonusuri", href: "/bonusuri-casino" },
    { label: `${bonus.bonusType} — ${bonus.casinoName}` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {bonus.faq?.length ? <JsonLd data={faqPageSchema(bonus.faq)} /> : null}
      <Breadcrumbs items={crumbs} />

      <BonusDetailHeader bonus={bonus} />

      <section>
        <SectionHeader title="Despre acest bonus" />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{bonus.intro}</p>
      </section>

      {casino ? (
        <section>
          <SectionHeader
            title="Cazinoul care oferă bonusul"
            action={{ label: "Vezi recenzia", href: casino.reviewUrl }}
          />
          <CasinoCard casino={casino} />
        </section>
      ) : null}

      <section>
        <SectionHeader title="Informații cheie" />
        <BonusFacts bonus={bonus} />
      </section>

      <section>
        <SectionHeader title="Termeni principali" />
        <ul className="flex max-w-[72ch] flex-col gap-2 text-sm text-ink-secondary">
          {bonus.terms.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-muted" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeader title="Avantaje și dezavantaje" />
        <ProsCons pros={bonus.pros} cons={bonus.cons} />
      </section>

      <section>
        <SectionHeader title="Cum revendici bonusul" />
        <ol className="flex max-w-[72ch] flex-col gap-3">
          {bonus.howToClaim.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/12 text-xs font-bold text-accent">
                {i + 1}
              </span>
              <span className="text-sm text-ink-secondary">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {similar.length ? (
        <section>
          <SectionHeader
            title="Bonusuri similare"
            action={{ label: "Toate bonusurile", href: "/bonusuri-casino" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((b) => (
              <BonusCard key={b.slug} bonus={b} />
            ))}
          </div>
        </section>
      ) : null}

      {bonus.faq?.length ? (
        <section>
          <SectionHeader title="Întrebări frecvente" />
          <FAQAccordion items={bonus.faq} />
        </section>
      ) : null}
    </div>
  );
}
