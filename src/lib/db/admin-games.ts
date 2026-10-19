import "server-only";
import type { ContentStatus } from "@/lib/content-status";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { Option } from "@/lib/db/admin-casinos";

export interface GameEditData {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  categoryId: string;
  thumbnailUrl: string;
  rtp: string;
  volatility: string;
  maxWin: string;
  releaseYear: string;
  reels: string;
  paylines: string;
  betRange: string;
  intro: string;
  mechanics: string;
  bonusFeatures: string[];
  demoUrl: string;
  faq: { question: string; answer: string }[];
  casinoIds: string[];
}

export async function listProviders(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("providers").select("id, name").order("name");
  if (error) throw new Error(`listProviders: ${error.message}`);
  return ((data as unknown as { id: string; name: string }[]) ?? []).map((r) => ({
    id: r.id,
    label: r.name,
  }));
}

export async function listGameCategories(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("game_categories").select("id, label").order("sort_order");
  if (error) throw new Error(`listGameCategories: ${error.message}`);
  return (data as unknown as Option[]) ?? [];
}

interface EditRow {
  id: string;
  slug: string;
  name: string;
  provider_id: string | null;
  category_id: string | null;
  thumbnail_url: string | null;
  rtp: number | null;
  volatility: string | null;
  max_win: string | null;
  release_year: number | null;
  reels: string | null;
  paylines: string | null;
  bet_range: string | null;
  intro: string | null;
  mechanics: string | null;
  bonus_features: string[] | null;
  demo_url: string | null;
  faq: { question: string; answer: string }[] | null;
  casino_games: { casino_id: string }[] | null;
}

const EDIT_SELECT =
  "id, slug, name, provider_id, category_id, thumbnail_url, rtp, volatility, max_win, release_year, reels, paylines, bet_range, intro, mechanics, bonus_features, demo_url, faq, casino_games(casino_id)";

export async function getGameEdit(slug: string): Promise<GameEditData | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("games").select(EDIT_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getGameEdit: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as EditRow;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    providerId: r.provider_id ?? "",
    categoryId: r.category_id ?? "",
    thumbnailUrl: r.thumbnail_url ?? "",
    rtp: r.rtp != null ? String(r.rtp) : "",
    volatility: r.volatility ?? "",
    maxWin: r.max_win ?? "",
    releaseYear: r.release_year != null ? String(r.release_year) : "",
    reels: r.reels ?? "",
    paylines: r.paylines ?? "",
    betRange: r.bet_range ?? "",
    intro: r.intro ?? "",
    mechanics: r.mechanics ?? "",
    bonusFeatures: r.bonus_features ?? [],
    demoUrl: r.demo_url ?? "",
    faq: r.faq ?? [],
    casinoIds: (r.casino_games ?? []).map((c) => c.casino_id),
  };
}

export interface AdminGameRow {
  id: string;
  slug: string;
  name: string;
  provider: string;
  rtp: number | null;
  volatility: string | null;
  status: ContentStatus;
}

export async function listAdminGames(filter: "all" | ContentStatus = "all"): Promise<AdminGameRow[]> {
  const db = await getSupabaseAuthClient();
  let q = db
    .from("games")
    .select("id, slug, name, rtp, volatility, status, provider:providers(name)")
    .order("status")
    .order("name");
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(`listAdminGames: ${error.message}`);
  return (
    (data as unknown as {
      id: string; slug: string; name: string; rtp: number | null;
      volatility: string | null; status: ContentStatus; provider: { name?: string } | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id, slug: r.slug, name: r.name, provider: r.provider?.name ?? "",
    rtp: r.rtp, volatility: r.volatility, status: r.status,
  }));
}
