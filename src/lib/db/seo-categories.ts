import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import { getBonuses } from "@/lib/db/bonuses";
import { getGames } from "@/lib/db/games";
import { getCasinos } from "@/lib/db/casinos";
import {
  bonusMatches,
  gameMatches,
  casinoMatches,
  type CategoryNamespace,
  type SeoCategory,
} from "@/lib/seo-categories";
import type { BonusCardData } from "@/types/bonus";
import type { GameCardData } from "@/types/game";
import type { CasinoCardData } from "@/types/casino";

/**
 * Public reads for SEO category pages. Only PUBLISHED categories are visible (RLS also
 * enforces this). Entities are selected by reusing the existing card loaders + a lightweight
 * "classify" projection, filtered through the deterministic predicates — NO data duplication.
 */

interface CategoryRow {
  id: string; namespace: string; slug: string; name: string; description: string | null;
  meta_title: string | null; meta_description: string | null; h1: string | null;
  intro: string | null; body: string | null; faq: { question: string; answer: string }[] | null;
  selector: string; status: string; sort_order: number; updated_at: string;
}
function mapCategory(r: CategoryRow): SeoCategory {
  return {
    id: r.id, namespace: r.namespace as CategoryNamespace, slug: r.slug, name: r.name,
    description: r.description, metaTitle: r.meta_title, metaDescription: r.meta_description,
    h1: r.h1, intro: r.intro, body: r.body, faq: r.faq ?? [], selector: r.selector,
    status: r.status as SeoCategory["status"], sortOrder: r.sort_order, updatedAt: r.updated_at,
  };
}

export async function getPublishedCategory(namespace: CategoryNamespace, slug: string): Promise<SeoCategory | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo_categories");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("seo_categories")
    .select("id, namespace, slug, name, description, meta_title, meta_description, h1, intro, body, faq, selector, status, sort_order, updated_at")
    .eq("namespace", namespace).eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw new Error(`getPublishedCategory: ${error.message}`);
  return data ? mapCategory(data as unknown as CategoryRow) : null;
}

export async function listPublishedCategories(namespace?: CategoryNamespace): Promise<SeoCategory[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("seo_categories");
  const db = getSupabaseServerClient();
  let q = db
    .from("seo_categories")
    .select("id, namespace, slug, name, description, meta_title, meta_description, h1, intro, body, faq, selector, status, sort_order, updated_at")
    .eq("status", "published");
  if (namespace) q = q.eq("namespace", namespace);
  const { data, error } = await q.order("namespace").order("sort_order").order("slug");
  if (error) throw new Error(`listPublishedCategories: ${error.message}`);
  return ((data as unknown as CategoryRow[]) ?? []).map(mapCategory);
}

export type CategoryEntities =
  | { namespace: "bonus"; items: BonusCardData[] }
  | { namespace: "game"; items: GameCardData[] }
  | { namespace: "casino"; items: CasinoCardData[] };

/** Entities that belong to a category, via the deterministic selector (reuses card loaders). */
export async function getCategoryEntities(category: SeoCategory): Promise<CategoryEntities> {
  const db = getSupabaseServerClient();
  if (category.namespace === "bonus") {
    const [cards, cls] = await Promise.all([
      getBonuses(),
      db.from("bonuses").select("slug, free_spins, is_no_deposit, is_no_wagering, bonus_type:bonus_types(slug)"),
    ]);
    const by = new Map<string, { typeSlug: string; freeSpins: number | null; isNoDeposit: boolean; isNoWagering: boolean }>();
    for (const r of (cls.data as unknown as { slug: string; free_spins: number | null; is_no_deposit: boolean; is_no_wagering: boolean; bonus_type: { slug: string } | null }[]) ?? [])
      by.set(r.slug, { typeSlug: r.bonus_type?.slug ?? "", freeSpins: r.free_spins, isNoDeposit: r.is_no_deposit, isNoWagering: r.is_no_wagering });
    const items = cards.filter((c) => { const k = by.get(c.slug); return k ? bonusMatches(category.selector, k) : false; });
    return { namespace: "bonus", items };
  }
  if (category.namespace === "game") {
    const [cards, cls] = await Promise.all([
      getGames(),
      db.from("games").select("slug, demo_url, category:game_categories(slug)"),
    ]);
    const by = new Map<string, { categorySlug: string; demoUrl: string | null }>();
    for (const r of (cls.data as unknown as { slug: string; demo_url: string | null; category: { slug: string } | null }[]) ?? [])
      by.set(r.slug, { categorySlug: r.category?.slug ?? "", demoUrl: r.demo_url });
    const items = cards.filter((c) => { const k = by.get(c.slug); return k ? gameMatches(category.selector, k) : false; });
    return { namespace: "game", items };
  }
  const [cards, cls] = await Promise.all([
    getCasinos(),
    db.from("casinos").select("slug, license, license_verified_at, tags(slug)"),
  ]);
  const by = new Map<string, { tags: string[]; license: string | null; licenseVerifiedAt: string | null }>();
  for (const r of (cls.data as unknown as { slug: string; license: string | null; license_verified_at: string | null; tags: { slug: string }[] | null }[]) ?? [])
    by.set(r.slug, { tags: (r.tags ?? []).map((t) => t.slug), license: r.license, licenseVerifiedAt: r.license_verified_at });
  const items = cards.filter((c) => { const k = by.get(c.slug); return k ? casinoMatches(category.selector, k) : false; });
  return { namespace: "casino", items };
}
