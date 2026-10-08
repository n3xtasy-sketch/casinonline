import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { ProsCons } from "@/components/casino/ProsCons";
import { BonusCard } from "@/components/bonuses/BonusCard";
import { BonusDetailHeader } from "@/components/bonuses/BonusDetailHeader";
import { BonusFacts } from "@/components/bonuses/BonusFacts";
import { allBonuses } from "@/data/bonuses";
import { allCasinos } from "@/data/casinos";
import { getBonusDetail, getAllBonusSlugs } from "@/data/bonus-details";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllBonusSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bonus = getBonusDetail(slug);
  if (!bonus) return {};
  return {
    title: `${bonus.bonusType} ${bonus.casinoName}`,
    description: bonus.intro,
  };
}

export default async function BonusDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const bonus = getBonusDetail(slug);
  if (!bonus) notFound();

  const casino = allCasinos.find((c) => c.slug === bonus.casinoSlug);

  const sameType = allBonuses.filter((b) => b.typeSlug === bonus.typeSlug && b.slug !== slug);
  const similar = (
    sameType.length ? sameType : allBonuses.filter((b) => b.slug !== slug)
  ).slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: "Bonusuri", href: "/bonusuri-casino" },
          { label: `${bonus.bonusType} — ${bonus.casinoName}` },
        ]}
      />

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
