import { siteConfig, absoluteUrl } from "./site";
import type { Crumb } from "@/components/ui/Breadcrumbs";

/**
 * Minimal, accurate Schema.org builders. We intentionally avoid types that would
 * require fabricated data (e.g. Review/AggregateRating with mock ratings).
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

export function itemListSchema(paths: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: paths.length,
    itemListElement: paths.map((path, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(path),
    })),
  };
}

export function articleSchema({
  title,
  description,
  author,
  path,
}: {
  title: string;
  description: string;
  author: string;
  path: string;
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
  };
}
