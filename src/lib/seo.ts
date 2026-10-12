import type { Metadata } from "next";
import { isSafeInternalPath } from "@/lib/guide-format";

/** SEO override row (seo_metadata). Client-safe — no server-only deps. */
export const SEO_TYPES = ["casino", "game", "provider", "payment_method", "bonus", "guide"] as const;
export type SeoType = (typeof SEO_TYPES)[number];

export interface SeoOverride {
  meta_title: string | null;
  meta_description: string | null;
  canonical: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
}

export interface MetaDefaults {
  title: string;
  description: string;
  path: string;
  ogType: "website" | "article";
}

const OG_FALLBACK = "/opengraph-image";

/** Fields the per-type default-title/description formulas may read. */
export interface EntityMetaInput {
  slug: string;
  name?: string;
  title?: string;
  intro?: string;
  excerpt?: string;
  provider?: string;
  bonusType?: string;
  casinoName?: string;
}

const SEO_LABEL: Record<SeoType, string> = {
  casino: "Cazino",
  game: "Joc",
  provider: "Furnizor",
  payment_method: "Metodă de plată",
  bonus: "Bonus",
  guide: "Ghid",
};
export function seoTypeLabel(t: SeoType): string {
  return SEO_LABEL[t];
}

/** Single source of truth for each entity type's DEFAULT metadata (mirrors pages). */
export function entityDefaultMeta(type: SeoType, e: EntityMetaInput): MetaDefaults {
  switch (type) {
    case "casino":
      return { title: `${e.name} — Recenzie`, description: e.intro ?? "", path: `/cazinouri-online/${e.slug}`, ogType: "website" };
    case "game":
      return { title: `${e.name} — ${e.provider}`, description: e.intro ?? "", path: `/jocuri-casino/${e.slug}`, ogType: "website" };
    case "provider":
      return { title: `${e.name} — Jocuri și cazinouri`, description: e.intro ?? "", path: `/furnizori/${e.slug}`, ogType: "website" };
    case "payment_method":
      return { title: `${e.name} la cazinouri online`, description: e.intro ?? "", path: `/metode-de-plata/${e.slug}`, ogType: "website" };
    case "bonus":
      return { title: `${e.bonusType} ${e.casinoName}`, description: e.intro ?? "", path: `/bonusuri-casino/${e.slug}`, ogType: "website" };
    case "guide":
      return { title: e.title ?? "", description: e.excerpt ?? "", path: `/ghiduri/${e.slug}`, ogType: "article" };
  }
}

export interface EffectiveSeo {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  index: boolean;
  follow: boolean;
  canonicalOverridden: boolean;
  ogImageCustom: boolean;
}

/** Resolve override-or-fallback. Shared by buildMetadata + admin health/previews. */
export function effectiveSeo(d: MetaDefaults, seo: SeoOverride | null): EffectiveSeo {
  const canonicalValid = !!seo?.canonical && isSafeInternalPath(seo.canonical);
  const title = seo?.meta_title?.trim() || d.title;
  const description = seo?.meta_description?.trim() || d.description;
  const ogImage = seo?.og_image?.trim() || OG_FALLBACK;
  return {
    title,
    description,
    canonical: canonicalValid ? (seo!.canonical as string) : d.path,
    ogTitle: seo?.og_title?.trim() || title,
    ogDescription: seo?.og_description?.trim() || description,
    ogImage,
    index: seo?.robots_index ?? true,
    follow: seo?.robots_follow ?? true,
    canonicalOverridden: canonicalValid,
    ogImageCustom: ogImage !== OG_FALLBACK,
  };
}

/**
 * Final Next Metadata. When `seo` is null/empty the output is BYTE-IDENTICAL to the
 * pages' previous inline metadata (robots omitted while index+follow are default).
 */
export function buildMetadata(d: MetaDefaults, seo: SeoOverride | null): Metadata {
  const e = effectiveSeo(d, seo);
  const meta: Metadata = {
    title: e.title,
    description: e.description,
    alternates: { canonical: e.canonical },
    openGraph: {
      type: d.ogType,
      siteName: "CasinOnline.ro",
      title: e.ogTitle,
      description: e.ogDescription,
      url: e.canonical,
      images: [e.ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: e.ogTitle,
      description: e.ogDescription,
      images: [e.ogImage],
    },
  };
  if (!e.index || !e.follow) meta.robots = { index: e.index, follow: e.follow };
  return meta;
}

/* ------------------------------- health eval ------------------------------- */

export type SeoIndicator = "green" | "yellow" | "red";
export interface SeoIssue {
  level: Exclude<SeoIndicator, "green">;
  msg: string;
}

export const TITLE_MIN = 30;
export const TITLE_MAX = 60;
export const DESC_MIN = 120;
export const DESC_MAX = 160;

export function evaluateSeo(
  d: MetaDefaults,
  seo: SeoOverride | null,
): { indicator: SeoIndicator; issues: SeoIssue[] } {
  const e = effectiveSeo(d, seo);
  const issues: SeoIssue[] = [];

  const t = e.title.trim().length;
  if (t === 0) issues.push({ level: "red", msg: "Meta title lipsă" });
  else if (t < TITLE_MIN) issues.push({ level: "yellow", msg: `Meta title scurt (${t}/${TITLE_MIN})` });
  else if (t > TITLE_MAX) issues.push({ level: "yellow", msg: `Meta title lung (${t}/${TITLE_MAX})` });

  const dsc = e.description.trim().length;
  if (dsc === 0) issues.push({ level: "red", msg: "Meta description lipsă" });
  else if (dsc < DESC_MIN) issues.push({ level: "yellow", msg: `Meta description scurtă (${dsc}/${DESC_MIN})` });
  else if (dsc > DESC_MAX) issues.push({ level: "yellow", msg: `Meta description lungă (${dsc}/${DESC_MAX})` });

  if (!e.ogImageCustom) issues.push({ level: "yellow", msg: "OG image pe fallback (/opengraph-image)" });

  if (seo?.canonical && !isSafeInternalPath(seo.canonical)) {
    issues.push({ level: "red", msg: "Canonical custom suspect (nu e rută internă)" });
  }
  if (!e.index) issues.push({ level: "red", msg: "noindex activ" });
  if (!e.follow) issues.push({ level: "yellow", msg: "nofollow activ" });

  const indicator: SeoIndicator = issues.some((i) => i.level === "red")
    ? "red"
    : issues.length
      ? "yellow"
      : "green";
  return { indicator, issues };
}
