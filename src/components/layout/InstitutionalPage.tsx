import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { institutionalCrumbs, institutionalPage } from "@/lib/institutional";
import type { GuideSection } from "@/types/guide";

/**
 * Reusable shell for static institutional / EEAT pages (Despre noi, Contact,
 * Politica editorială, etc.). Server component. Provides the consistent EEAT
 * layout: breadcrumbs (+ BreadcrumbList schema), a single H1, an optional
 * "last updated" line, an optional table of contents, and H2/H3 section body.
 *
 * Content is passed in by each route (static, version-controlled). This component
 * invents nothing — it only lays out what the route provides.
 */
export interface InstitutionalPageProps {
  /** Registry slug. `ready` here is the SINGLE, unavoidable publish switch: every
   *  institutional route renders through this component, and a not-ready slug 404s
   *  — so a route file that exists before its page is ready cannot be served. */
  slug: string;
  /** Page H1 (also drives the breadcrumb current label). */
  title: string;
  /** Optional lead paragraph under the H1. */
  intro?: string;
  /** ISO date (YYYY-MM-DD) → rendered as "Ultima actualizare". Omit if unknown. */
  updatedAt?: string;
  /** H2/H3 sections with anchor ids (same shape as guide content). */
  sections?: GuideSection[];
  /** Render a table of contents when there are enough H2 headings (default: auto ≥3). */
  toc?: boolean;
  /** Extra JSON-LD for this page (e.g. pageSchema / articleSchema) — only when justified. */
  schema?: object | object[];
  /** Arbitrary extra content rendered after the sections (custom blocks). */
  children?: ReactNode;
}

function formatDate(iso: string): string {
  // Display-only; avoids Date.now/locale surprises by formatting the given ISO date.
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}.${m}.${y}` : iso;
}

export function InstitutionalPage({
  slug,
  title,
  intro,
  updatedAt,
  sections = [],
  toc,
  schema,
  children,
}: InstitutionalPageProps) {
  // Publish gate (unavoidable): an unknown or not-ready slug is a 404, even if a
  // route file exists. `ready` in the registry is the only switch that publishes.
  const page = institutionalPage(slug);
  if (!page || !page.ready) notFound();

  const crumbs = institutionalCrumbs(title);
  const h2 = sections.filter((s) => s.level === 2).map((s) => ({ id: s.id, label: s.heading }));
  const showToc = toc ?? h2.length >= 3;
  const extraSchema = schema ? (Array.isArray(schema) ? schema : [schema]) : [];

  return (
    <article className="flex flex-col gap-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {extraSchema.map((s, i) => (
        <JsonLd key={i} data={s} />
      ))}
      <Breadcrumbs items={crumbs} />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink md:text-3xl">{title}</h1>
        {updatedAt ? (
          <p className="text-[13px] text-ink-muted">Ultima actualizare: {formatDate(updatedAt)}</p>
        ) : null}
        {intro ? <p className="max-w-[72ch] text-lg leading-relaxed text-ink-secondary">{intro}</p> : null}
      </header>

      {showToc && h2.length ? <TableOfContents items={h2} /> : null}

      {sections.length ? (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.id} className="scroll-mt-24">
              {section.level === 2 ? (
                <h2 id={section.id} className="text-xl font-bold text-ink md:text-2xl">
                  {section.heading}
                </h2>
              ) : (
                <h3 id={section.id} className="text-lg font-semibold text-ink">
                  {section.heading}
                </h3>
              )}
              <div className="mt-3 flex max-w-[72ch] flex-col gap-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="leading-relaxed text-ink-secondary">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {children}
    </article>
  );
}
