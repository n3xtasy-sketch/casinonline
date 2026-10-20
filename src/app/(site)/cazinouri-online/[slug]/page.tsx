import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqPageSchema, casinoReviewSchema } from "@/lib/schema";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { CasinoReviewHeader } from "@/components/casino/CasinoReviewHeader";
import { CasinoFacts } from "@/components/casino/CasinoFacts";
import { ProsCons } from "@/components/casino/ProsCons";
import { getCasinoBySlug, getRelatedCasinos } from "@/lib/db/casinos";
import { buildMetadata, entityDefaultMeta } from "@/lib/seo";
import { getSeoForSlug } from "@/lib/db/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// DB-backed detail: render per request (no build-time DB dependency).
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const casino = await getCasinoBySlug(slug);
  if (!casino) return {};
  return buildMetadata(entityDefaultMeta("casino", casino), await getSeoForSlug("casino", slug));
}

export default async function CasinoReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const casino = await getCasinoBySlug(slug);
  if (!casino) notFound();

  const related = await getRelatedCasinos(slug);

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Cazinouri", href: "/cazinouri-online" },
    { label: casino.name },
  ];

  // Editorial Review JSON-LD only when a real rating exists (null/0 → no Review).
  const reviewSchema = casinoReviewSchema({
    name: casino.name,
    path: `/cazinouri-online/${slug}`,
    rating: casino.rating,
  });

  return (
    <div className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {reviewSchema ? <JsonLd data={reviewSchema} /> : null}
      {casino.faq?.length ? <JsonLd data={faqPageSchema(casino.faq)} /> : null}
      <Breadcrumbs items={crumbs} />

      <CasinoReviewHeader casino={casino} />

      <section>
        <SectionHeader title={`Despre ${casino.name}`} />
        <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{casino.intro}</p>
      </section>

      <section>
        <SectionHeader title="Informații cheie" />
        <CasinoFacts casino={casino} />
      </section>

      <section>
        <SectionHeader title="Avantaje și dezavantaje" />
        <ProsCons pros={casino.pros} cons={casino.cons} />
      </section>

      {casino.paymentMethods?.length ? (
        <section>
          <SectionHeader title="Metode de plată" />
          <div className="flex flex-wrap gap-2">
            {casino.paymentMethods.map((m) => (
              <Badge key={m} tone="neutral">
                {m}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <Card padding="lg">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-ink">Părerea editorului</h2>
          <span className="shrink-0 rounded-sm bg-elevated px-3 py-1.5 text-sm font-bold text-gold">
            {casino.editorScore}/10
          </span>
        </div>
        <p className="mt-3 max-w-[72ch] leading-relaxed text-ink-secondary">
          {casino.editorReview}
        </p>
      </Card>

      {casino.faq?.length ? (
        <section>
          <SectionHeader title="Întrebări frecvente" />
          <FAQAccordion items={casino.faq} />
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Cazinouri similare"
          action={{ label: "Vezi toate", href: "/cazinouri-online" }}
        />
        <div className="flex flex-col gap-4">
          {related.map((c) => (
            <CasinoCard key={c.slug} casino={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
