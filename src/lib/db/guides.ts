import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import type {
  GuideCardData,
  GuideDetail,
  GuideSection,
  GuideRelatedLink,
} from "@/types/guide";

interface GuideRow {
  slug: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  updated_at: string;
  category: { slug: string; label: string } | null;
}

interface GuideDetailRow extends GuideRow {
  intro: string | null;
  reading_time: string | null;
  sections: GuideSection[] | null;
  related_links: GuideRelatedLink[] | null;
  faq: { question: string; answer: string }[] | null;
}

const RO_MONTH_YEAR = new Intl.DateTimeFormat("ro-RO", { month: "short", year: "numeric" });

/** DB timestamps → "oct. 2026"-style display string (prefers published_at). */
function formatUpdated(iso: string): string {
  return RO_MONTH_YEAR.format(new Date(iso));
}

/** Allow only internal relative paths in related links (reject //, javascript:, data:, absolute URLs). */
function isSafeInternalPath(href: unknown): boolean {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

function toCard(row: GuideRow): GuideCardData {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category?.label ?? "",
    categorySlug: row.category?.slug ?? "",
    excerpt: row.excerpt ?? "",
    imageUrl: row.image_url ?? undefined,
    author: row.author ?? "",
    updatedAt: formatUpdated(row.published_at ?? row.updated_at),
    href: `/ghiduri/${row.slug}`,
  };
}

function toDetail(row: GuideDetailRow): GuideDetail {
  return {
    ...toCard(row),
    intro: row.intro ?? "",
    readingTime: row.reading_time ?? undefined,
    sections: row.sections ?? [],
    relatedLinks: (row.related_links ?? []).filter((l) => isSafeInternalPath(l?.href)),
    faq: row.faq ?? [],
    publishedAt: row.published_at ?? undefined,
    modifiedAt: row.updated_at,
  };
}

const CARD_SELECT =
  "slug, title, excerpt, image_url, author, published_at, updated_at, category:guide_categories(slug, label)";

const DETAIL_SELECT = `${CARD_SELECT}, intro, reading_time, sections, related_links, faq`;

/** All guides for the listing (the page applies filter/sort). */
export async function getGuides(): Promise<GuideCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("guides");
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("guides").select(CARD_SELECT).order("created_at");
  if (error) throw new Error(`getGuides: ${error.message}`);
  return (data as unknown as GuideRow[]).map(toCard);
}

/**
 * Related guides (same category, excluding one), falling back to any other guide.
 * Reuses the cached full list (created_at timestamps are tied, so a LIMIT query
 * would reorder ties vs the current slice behaviour — output must stay stable).
 */
export async function getSimilarGuides(
  categorySlug: string,
  excludeSlug: string,
  limit = 3,
): Promise<GuideCardData[]> {
  const all = await getGuides();
  const sameCat = all.filter((g) => g.categorySlug === categorySlug && g.slug !== excludeSlug);
  return (sameCat.length ? sameCat : all.filter((g) => g.slug !== excludeSlug)).slice(0, limit);
}

/** Single guide article by slug, or null when not found. */
export async function getGuideBySlug(slug: string): Promise<GuideDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("guides");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("guides")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getGuideBySlug: ${error.message}`);
  return data ? toDetail(data as unknown as GuideDetailRow) : null;
}
