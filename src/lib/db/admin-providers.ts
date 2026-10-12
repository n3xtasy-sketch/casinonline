import "server-only";
import type { ContentStatus } from "@/lib/content-status";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";

export interface ProviderEditData {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  category: string;
  founded: string;
  country: string;
  specialty: string;
  rtpRange: string;
  intro: string;
  faq: { question: string; answer: string }[];
  /** Read-only — owned by the 0008 trigger (sync_provider_game_count). */
  gameCount: number;
}

interface EditRow {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  founded: number | null;
  country: string | null;
  specialty: string | null;
  rtp_range: string | null;
  intro: string | null;
  faq: { question: string; answer: string }[] | null;
  game_count: number | null;
}

const EDIT_SELECT =
  "id, slug, name, logo_url, category, founded, country, specialty, rtp_range, intro, faq, game_count";

export async function getProviderEdit(slug: string): Promise<ProviderEditData | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("providers")
    .select(EDIT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getProviderEdit: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as EditRow;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    logoUrl: r.logo_url ?? "",
    category: r.category ?? "",
    founded: r.founded != null ? String(r.founded) : "",
    country: r.country ?? "",
    specialty: r.specialty ?? "",
    rtpRange: r.rtp_range ?? "",
    intro: r.intro ?? "",
    faq: r.faq ?? [],
    gameCount: r.game_count ?? 0,
  };
}

/** Distinct existing category values, for the form's datalist (free-text column). */
export async function listProviderCategories(): Promise<string[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("providers").select("category");
  if (error) throw new Error(`listProviderCategories: ${error.message}`);
  const set = new Set(
    ((data as unknown as { category: string | null }[]) ?? [])
      .map((r) => r.category)
      .filter((c): c is string => Boolean(c)),
  );
  return [...set].sort();
}

export interface AdminProviderRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  gameCount: number;
  status: ContentStatus;
}

export async function listAdminProviders(filter: "all" | ContentStatus = "all"): Promise<AdminProviderRow[]> {
  const db = await getSupabaseAuthClient();
  let q = db
    .from("providers")
    .select("id, slug, name, category, game_count, status")
    .order("status")
    .order("name");
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(`listAdminProviders: ${error.message}`);
  return (
    (data as unknown as {
      id: string; slug: string; name: string; category: string | null;
      game_count: number | null; status: ContentStatus;
    }[]) ?? []
  ).map((r) => ({
    id: r.id, slug: r.slug, name: r.name, category: r.category,
    gameCount: r.game_count ?? 0, status: r.status,
  }));
}
