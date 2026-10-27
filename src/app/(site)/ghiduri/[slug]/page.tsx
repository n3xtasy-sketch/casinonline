import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, articleSchema, faqPageSchema } from "@/lib/schema";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { GuideCard } from "@/components/guides/GuideCard";
import { GuideArticleHeader } from "@/components/guides/GuideArticleHeader";
import { EditorialByline } from "@/components/layout/EditorialByline";
import { resolveByline } from "@/lib/editorial";
import { GuideBody } from "@/components/guides/GuideBody";
import { getGuideBySlug, getSimilarGuides } from "@/lib/db/guides";
import { buildMetadata, entityDefaultMeta } from "@/lib/seo";
import { getSeoForSlug } from "@/lib/db/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// DB-backed article: render per request (no build-time DB dependency).
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return {};
  return buildMetadata(entityDefaultMeta("guide", guide), await getSeoForSlug("guide", slug));
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) notFound();

  const tocItems = guide.sections
    .filter((s) => s.level === 2)
    .map((s) => ({ id: s.id, label: s.heading }));

  const related = await getSimilarGuides(guide.categorySlug, slug);

  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: "Ghiduri", href: "/ghiduri" },
    { label: guide.title },
  ];

  const byline = resolveByline({
    authorSlug: guide.editorial?.authorSlug ?? null,
    verifierSlug: guide.editorial?.verifierSlug ?? null,
    verifiedAt: guide.editorial?.editorialVerifiedAt ?? null,
    updatedAt: guide.editorial?.updatedAt ?? null,
  });

  return (
    <article className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <JsonLd
        data={articleSchema({
          title: guide.title,
          description: guide.excerpt,
          author: guide.author,
          authorPerson: byline.author ? { name: byline.author.name, url: byline.author.href } : null,
          reviewedBy: byline.verifier ? { name: byline.verifier.name, url: byline.verifier.href } : null,
          path: `/ghiduri/${slug}`,
          datePublished: guide.publishedAt,
          dateModified: guide.modifiedAt,
          image: guide.imageUrl,
        })}
      />
      {guide.faq?.length ? <JsonLd data={faqPageSchema(guide.faq)} /> : null}
      <Breadcrumbs items={crumbs} />

      <GuideArticleHeader guide={guide} />

      {guide.editorial ? (
        <EditorialByline
          authorSlug={guide.editorial.authorSlug}
          verifierSlug={guide.editorial.verifierSlug}
          verifiedAt={guide.editorial.editorialVerifiedAt}
          updatedAt={guide.editorial.updatedAt}
        />
      ) : null}

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
