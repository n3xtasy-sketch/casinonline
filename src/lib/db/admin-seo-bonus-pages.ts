import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";

/** Admin reads for evergreen bonus pages + the form option data (admin RLS, all statuses). */

export interface EvergreenPageRow {
  id: string;
  casinoId: string;
  casinoName: string;
  casinoSlug: string;
  intent: string;
  featuredBonusId: string | null;
  h1: string | null;
  intro: string | null;
  body: string | null;
  faq: { question: string; answer: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
}

const COLS = "id, casino_id, intent, featured_bonus_id, h1, intro, body, faq, meta_title, meta_description, status, casino:casinos(name, slug)";

function map(r: Record<string, unknown>): EvergreenPageRow {
  const casino = r.casino as { name: string; slug: string } | null;
  return {
    id: r.id as string, casinoId: r.casino_id as string, casinoName: casino?.name ?? "", casinoSlug: casino?.slug ?? "",
    intent: r.intent as string, featuredBonusId: (r.featured_bonus_id as string | null) ?? null,
    h1: (r.h1 as string | null) ?? null, intro: (r.intro as string | null) ?? null, body: (r.body as string | null) ?? null,
    faq: (r.faq as { question: string; answer: string }[] | null) ?? [], metaTitle: (r.meta_title as string | null) ?? null,
    metaDescription: (r.meta_description as string | null) ?? null, status: r.status as string,
  };
}

export async function listEvergreenPages(): Promise<EvergreenPageRow[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("seo_bonus_pages").select(COLS).order("created_at", { ascending: false });
  if (error) throw new Error(`listEvergreenPages: ${error.message}`);
  return ((data as Record<string, unknown>[]) ?? []).map(map);
}

export async function getEvergreenPageById(id: string): Promise<EvergreenPageRow | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("seo_bonus_pages").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getEvergreenPageById: ${error.message}`);
  return data ? map(data as Record<string, unknown>) : null;
}

export interface OperatorOption { id: string; slug: string; name: string }
export async function listOperators(): Promise<OperatorOption[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("casinos").select("id, slug, name").eq("status", "published").order("name");
  if (error) throw new Error(`listOperators: ${error.message}`);
  return ((data as unknown as OperatorOption[]) ?? []);
}

export interface BonusOption {
  id: string; casinoId: string; offer: string; typeSlug: string;
  freeSpins: number | null; isNoDeposit: boolean; isNoWagering: boolean;
}
/** Bonuses for the featured select (client filters by operator; server validates intent-match). */
export async function listBonusOptions(): Promise<BonusOption[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("bonuses")
    .select("id, casino_id, offer, free_spins, is_no_deposit, is_no_wagering, bonus_type:bonus_types(slug)")
    .order("offer");
  if (error) throw new Error(`listBonusOptions: ${error.message}`);
  return ((data as unknown as { id: string; casino_id: string; offer: string; free_spins: number | null; is_no_deposit: boolean; is_no_wagering: boolean; bonus_type: { slug: string } | null }[]) ?? [])
    .map((r) => ({ id: r.id, casinoId: r.casino_id, offer: r.offer, typeSlug: r.bonus_type?.slug ?? "", freeSpins: r.free_spins, isNoDeposit: r.is_no_deposit, isNoWagering: r.is_no_wagering }));
}
