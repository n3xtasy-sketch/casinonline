/**
 * Institutional / EEAT pages registry + pure helpers (client-safe, no server deps).
 *
 * These pages are STATIC (content lives in code, version-controlled + legally
 * reviewed). This registry is the single gate for visibility: a page appears in
 * the Footer and the sitemap ONLY when `ready: true`. A page becomes ready only
 * after its real content is written and its route file exists — so incomplete /
 * placeholder pages are never linked or indexed.
 *
 * Nothing here fabricates company, contact, author, licensing, legal or editorial
 * facts; titles/labels are page purposes, the body content is supplied per route.
 */

import type { Metadata } from "next";
import type { Crumb } from "@/components/ui/Breadcrumbs";

export type InstitutionalSchemaKind = "AboutPage" | "ContactPage" | "WebPage" | "Article";

export interface InstitutionalPageMeta {
  /** URL slug under the (site) group, e.g. "despre-noi" → /despre-noi */
  slug: string;
  /** H1 + footer/nav label base. */
  title: string;
  /** Footer link label. */
  navLabel: string;
  /** Which Schema.org type is justified for this page (rendered only when ready). */
  schemaKind: InstitutionalSchemaKind;
  /**
   * Live gate. false = route/content not finished → NOT in Footer, NOT in sitemap.
   * Flip to true only once the route file + real content exist (see activation docs).
   */
  ready: boolean;
}

/**
 * The 7 institutional pages (FAZA 4.1). All start NOT ready — this infra PR ships
 * the reusable plumbing without publishing any page. Each is activated individually
 * when its real content lands.
 */
export const INSTITUTIONAL_PAGES: InstitutionalPageMeta[] = [
  { slug: "despre-noi", title: "Despre noi", navLabel: "Despre noi", schemaKind: "AboutPage", ready: false },
  { slug: "contact", title: "Contact", navLabel: "Contact", schemaKind: "ContactPage", ready: false },
  { slug: "politica-editoriala", title: "Politica editorială", navLabel: "Politica editorială", schemaKind: "Article", ready: false },
  { slug: "cum-evaluam-cazinourile", title: "Cum evaluăm cazinourile", navLabel: "Cum evaluăm cazinourile", schemaKind: "Article", ready: false },
  { slug: "autori", title: "Autori", navLabel: "Autori", schemaKind: "WebPage", ready: false },
  { slug: "joc-responsabil", title: "Joc responsabil", navLabel: "Joc responsabil", schemaKind: "WebPage", ready: false },
  { slug: "licente-si-reglementare", title: "Licențe și reglementare", navLabel: "Licențe și reglementare", schemaKind: "WebPage", ready: false },
];

/** Lookup by slug (used by route files to resolve their registry entry). */
export function institutionalPage(slug: string): InstitutionalPageMeta | undefined {
  return INSTITUTIONAL_PAGES.find((p) => p.slug === slug);
}

/** Pages that are live: the ONLY ones linked in the Footer + listed in the sitemap. */
export function readyInstitutionalPages(): InstitutionalPageMeta[] {
  return INSTITUTIONAL_PAGES.filter((p) => p.ready);
}

/** Footer "Informații" links — ready pages only (single source for the Footer + its test). */
export function institutionalFooterLinks(): { label: string; href: string }[] {
  return readyInstitutionalPages().map((p) => ({ label: p.navLabel, href: `/${p.slug}` }));
}

/** Breadcrumb trail for an institutional page: Acasă → <title>. */
export function institutionalCrumbs(title: string): Crumb[] {
  return [{ label: "Acasă", href: "/" }, { label: title }];
}

/**
 * Metadata for an institutional route. Description is supplied by the route (real
 * content) — never defaulted to a fabricated sentence. Canonical is the clean path.
 */
export function institutionalMetadata(args: {
  slug: string;
  title: string;
  description: string;
}): Metadata {
  const path = `/${args.slug}`;
  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: args.title,
      description: args.description,
      url: path,
    },
    twitter: { card: "summary_large_image", title: args.title, description: args.description },
  };
}

export interface InstitutionalSitemapEntry {
  url: string;
  changeFrequency: "yearly";
  priority: number;
}

/** Sitemap entries for READY institutional pages only (empty until pages go live). */
export function institutionalSitemapEntries(baseUrl: string): InstitutionalSitemapEntry[] {
  const base = baseUrl.replace(/\/$/, "");
  return readyInstitutionalPages().map((p) => ({
    url: `${base}/${p.slug}`,
    changeFrequency: "yearly" as const,
    priority: 0.4,
  }));
}
