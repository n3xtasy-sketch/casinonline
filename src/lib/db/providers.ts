import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import type { ProviderCardData, ProviderDetail } from "@/types/provider";

/** DB row shapes (snake_case) for the providers table. */
interface ProviderRow {
  slug: string;
  name: string;
  logo_url: string | null;
  game_count: number;
  category: string | null;
}

interface ProviderDetailRow extends ProviderRow {
  founded: number | null;
  country: string | null;
  specialty: string | null;
  rtp_range: string | null;
  intro: string | null;
  faq: { question: string; answer: string }[] | null;
}

function toCard(row: ProviderRow): ProviderCardData {
  return {
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    gameCount: row.game_count,
    category: row.category ?? undefined,
    href: `/furnizori/${row.slug}`,
  };
}

function toDetail(row: ProviderDetailRow): ProviderDetail {
  return {
    ...toCard(row),
    intro: row.intro ?? "",
    founded: row.founded != null ? String(row.founded) : undefined,
    country: row.country ?? undefined,
    specialty: row.specialty ?? undefined,
    rtpRange: row.rtp_range ?? undefined,
    faq: row.faq ?? [],
  };
}

const CARD_COLUMNS = "slug, name, logo_url, game_count, category";

/** All providers for the listing (default order: most games first). */
export async function getProviders(limit?: number): Promise<ProviderCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("providers");
  const db = getSupabaseServerClient();
  let query = db.from("providers").select(CARD_COLUMNS).order("game_count", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(`getProviders: ${error.message}`);
  return (data as ProviderRow[]).map(toCard);
}

/** Other providers for the "related" block (most games first), excluding one slug. */
export async function getRelatedProviders(
  excludeSlug: string,
  limit = 3,
): Promise<ProviderCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("providers");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("providers")
    .select(CARD_COLUMNS)
    .neq("slug", excludeSlug)
    .order("game_count", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRelatedProviders: ${error.message}`);
  return (data as ProviderRow[]).map(toCard);
}

/** Single provider (detail) by slug, or null when not found. */
export async function getProviderBySlug(slug: string): Promise<ProviderDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("providers");
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("providers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getProviderBySlug: ${error.message}`);
  return data ? toDetail(data as ProviderDetailRow) : null;
}
