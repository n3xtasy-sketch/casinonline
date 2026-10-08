import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { GuideCard } from "@/components/guides/GuideCard";
import { GuideArticleHeader } from "@/components/guides/GuideArticleHeader";
import { GuideBody } from "@/components/guides/GuideBody";
import { allGuides } from "@/data/guides";
import { getGuideDetail, getAllGuideSlugs } from "@/data/guide-details";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideDetail(slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.excerpt };
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideDetail(slug);
  if (!guide) notFound();

  const tocItems = guide.sections
    .filter((s) => s.level === 2)
    .map((s) => ({ id: s.id, label: s.heading }));

  const sameCategory = allGuides.filter(
    (g) => g.categorySlug === guide.categorySlug && g.slug !== slug,
  );
  const related = (
    sameCategory.length ? sameCategory : allGuides.filter((g) => g.slug !== slug)
  ).slice(0, 3);

  return (
    <article className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: "Ghiduri", href: "/ghiduri" },
          { label: guide.title },
        ]}
      />

      <GuideArticleHeader guide={guide} />

      <p className="max-w-[72ch] text-lg leading-relaxed text-ink-secondary">{guide.intro}</p>

      {tocItems.length >= 3 ? <TableOfContents items={tocItems} /> : null}

      <GuideBody sections={guide.sections} />

      <RelatedLinks links={guide.relatedLinks} />

      {guide.faq?.length ? (
        <section>
          <SectionHeader title="Întrebări frecvente" />
          <FAQAccordion items={guide.faq} />
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Articole similare"
          action={{ label: "Toate ghidurile", href: "/ghiduri" }}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((g) => (
            <GuideCard key={g.slug} guide={g} />
          ))}
        </div>
      </section>
    </article>
  );
}
