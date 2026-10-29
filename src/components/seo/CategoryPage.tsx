import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { JsonLd } from "@/components/seo/JsonLd";
import { BonusCard } from "@/components/bonuses/BonusCard";
import { GameCard } from "@/components/games/GameCard";
import { CasinoCard } from "@/components/casino/CasinoCard";
import { breadcrumbSchema, itemListSchema, faqPageSchema } from "@/lib/schema";
import { absoluteUrl } from "@/lib/site";
import { categoryPath, NAMESPACE_BASE, type CategoryNamespace, type SeoCategory } from "@/lib/seo-categories";
import type { CategoryEntities } from "@/lib/db/seo-categories";

const HUB_LABEL: Record<CategoryNamespace, string> = { bonus: "Bonusuri", game: "Jocuri", casino: "Cazinouri" };

/** Metadata for a category page: self-referencing canonical, meta title/description fallbacks. */
export function categoryMetadata(category: SeoCategory): Metadata {
  const url = categoryPath(category.namespace, category.slug);
  const title = category.metaTitle || category.name;
  const description = category.metaDescription || category.description || category.name;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", siteName: "CasinOnline.ro", url, images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

function entityItems(entities: CategoryEntities): { name: string; url: string }[] {
  if (entities.namespace === "bonus") return entities.items.map((b) => ({ name: `${b.bonusType} — ${b.casinoName}`, url: absoluteUrl(b.href) }));
  if (entities.namespace === "game") return entities.items.map((g) => ({ name: g.name, url: absoluteUrl(g.href) }));
  return entities.items.map((c) => ({ name: c.name, url: absoluteUrl(c.reviewUrl) }));
}

export function CategoryPage({ category, entities }: { category: SeoCategory; entities: CategoryEntities }) {
  const crumbs = [
    { label: "Acasă", href: "/" },
    { label: HUB_LABEL[category.namespace], href: NAMESPACE_BASE[category.namespace] },
    { label: category.name },
  ];
  const count = entities.items.length;
  const list = entityItems(entities);

  return (
    <div className="flex flex-col gap-6">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {list.length ? <JsonLd data={itemListSchema(list)} /> : null}
      {category.faq.length ? <JsonLd data={faqPageSchema(category.faq)} /> : null}

      <Breadcrumbs items={crumbs} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink md:text-4xl">{category.h1 || category.name}</h1>
        {category.intro ? <p className="max-w-[72ch] whitespace-pre-line text-ink-secondary">{category.intro}</p> : null}
      </header>

      <h2 className="sr-only">Listă</h2>
      {count ? (
        entities.namespace === "bonus" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {entities.items.map((b) => <BonusCard key={b.slug} bonus={b} />)}
          </div>
        ) : entities.namespace === "game" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {entities.items.map((g) => <GameCard key={g.slug} game={g} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {entities.items.map((c) => <CasinoCard key={c.slug} casino={c} />)}
          </div>
        )
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
          Momentan nu avem intrări în această categorie.
        </div>
      )}

      {category.body ? (
        <section className="prose prose-invert max-w-[72ch] whitespace-pre-line text-ink-secondary">{category.body}</section>
      ) : null}

      {category.faq.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-ink">Întrebări frecvente</h2>
          <FAQAccordion items={category.faq} />
        </section>
      ) : null}
    </div>
  );
}
