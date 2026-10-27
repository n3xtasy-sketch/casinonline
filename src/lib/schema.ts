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
export function casinoReviewSchema({
  name,
  path,
  rating,
}: {
  name: string;
  path: string;
  rating?: number | null;
}) {
  if (rating == null || rating <= 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Organization", name },
    author: { "@type": "Organization", name: siteConfig.name },
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
  path,
  datePublished,
  dateModified,
  image,
}: {
  title: string;
  description: string;
  author: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: { "@type": "Organization", name: author },
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
