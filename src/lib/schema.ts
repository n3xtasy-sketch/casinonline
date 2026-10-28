import { siteConfig, absoluteUrl } from "./site";
import type { Crumb } from "@/components/ui/Breadcrumbs";

/**
 * Minimal, accurate Schema.org builders. We intentionally avoid types that would
 * require fabricated data (e.g. AggregateRating implies a user-rating pool we
 * don't have). Casino ratings are editorial, so they are expressed as a critic
 * Review authored by CasinOnline.ro.
 */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: "ro-RO",
  };
}

/**
 * Minimal page schema for institutional/EEAT pages. Only the honest basics
 * (type, name, url, language, isPartOf WebSite). No ratings/authors fabricated;
 * editorial pages that have a real author+date use articleSchema instead.
 */
export function pageSchema(
  kind: "AboutPage" | "ContactPage" | "WebPage",
  args: { name: string; description?: string; path: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": kind,
    name: args.name,
    ...(args.description ? { description: args.description } : {}),
    url: absoluteUrl(args.path),
    inLanguage: "ro-RO",
    isPartOf: { "@type": "WebSite", url: siteConfig.url },
  };
}

/**
 * Person schema for an author profile page. Only honest, documented fields; callers
 * pass alumniOf only when education is publicly documented. No fabricated awards.
 */
export function personSchema(args: {
  name: string;
  jobTitle: string;
  description: string;
  path: string;
  knowsAbout?: string[];
  alumniOf?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: args.name,
    jobTitle: args.jobTitle,
    description: args.description,
    url: absoluteUrl(args.path),
    worksFor: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    ...(args.knowsAbout?.length ? { knowsAbout: args.knowsAbout } : {}),
    ...(args.alumniOf?.length
      ? { alumniOf: args.alumniOf.map((n) => ({ "@type": "Organization", name: n })) }
      : {}),
  };
}

export function breadcrumbSchema(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
    })),
  };
}

export function itemListSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.url),
    })),
  };
}

export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/**
 * Editorial critic review of a casino operator, authored by CasinOnline.ro.
 * The rating is OUR editorial 0–5 star score (the one shown on the page) — not
 * aggregated user ratings, so no AggregateRating is emitted.
 *
 * Returns `null` when the editorial rating is missing or non-positive: an unrated
 * casino has no valid Review (emitting `ratingValue: 0` under `worstRating: 1` is
 * invalid structured data and we never fabricate a score).
 */
/** A real person (author/verifier) resolved from the author registry, for schema. */
export interface SchemaPerson {
  name: string;
  /** site-relative profile path, e.g. /autori/<slug> */
  url: string;
}

export function casinoReviewSchema({
  name,
  path,
  rating,
  authorPerson,
  reviewedBy,
}: {
  name: string;
  path: string;
  rating?: number | null;
  /** Human author of the review; when absent, authorship stays with the organization. */
  authorPerson?: SchemaPerson | null;
  /** Only pass when a REAL editorial verification exists (verifier + verified_at). */
  reviewedBy?: SchemaPerson | null;
}) {
  if (rating == null || rating <= 0) return null;
  const author = authorPerson
    ? { "@type": "Person", name: authorPerson.name, url: absoluteUrl(authorPerson.url) }
    : { "@type": "Organization", name: siteConfig.name };
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Organization", name },
    author,
    ...(reviewedBy
      ? { reviewedBy: { "@type": "Person", name: reviewedBy.name, url: absoluteUrl(reviewedBy.url) } }
      : {}),
    reviewRating: {
      "@type": "Rating",
      ratingValue: rating,
      bestRating: 5,
      worstRating: 1,
    },
    url: absoluteUrl(path),
    inLanguage: "ro-RO",
  };
}

export function articleSchema({
  title,
  description,
  author,
  authorPerson,
  reviewedBy,
  path,
  datePublished,
  dateModified,
  image,
}: {
  title: string;
  description: string;
  /** Fallback author name (organization) when no real person is assigned. */
  author: string;
  /** Real human author resolved from the registry; takes precedence over `author`. */
  authorPerson?: SchemaPerson | null;
  /** Only pass when a REAL editorial verification exists (verifier + verified_at). */
  reviewedBy?: SchemaPerson | null;
  path: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
}) {
  const authorNode = authorPerson
    ? { "@type": "Person", name: authorPerson.name, url: absoluteUrl(authorPerson.url) }
    : { "@type": "Organization", name: author };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: authorNode,
    ...(reviewedBy
      ? { reviewedBy: { "@type": "Person", name: reviewedBy.name, url: absoluteUrl(reviewedBy.url) } }
      : {}),
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: "ro-RO",
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(image ? { image: /^https?:\/\//.test(image) ? image : absoluteUrl(image) } : {}),
  };
}
