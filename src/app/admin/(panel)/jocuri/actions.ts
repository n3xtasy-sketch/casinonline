"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { applyStatusChange } from "@/lib/db/content-status";
import { isAllowedDemoUrl } from "@/lib/demo";
import type { ContentStatus } from "@/lib/content-status";
import type { GameFormState } from "./types";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function parseLines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
function parseFaq(v: FormDataEntryValue | null): { question: string; answer: string }[] {
  return String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [q, ...rest] = line.split("|");
      return { question: (q ?? "").trim(), answer: rest.join("|").trim() };
    })
    .filter((x) => x.question && x.answer);
}

function parseFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    provider_id: strOrNull(formData.get("provider_id")),
    category_id: strOrNull(formData.get("category_id")),
    thumbnail_url: strOrNull(formData.get("thumbnail_url")),
    rtp: numOrNull(formData.get("rtp")),
    volatility: strOrNull(formData.get("volatility")),
    max_win: strOrNull(formData.get("max_win")),
    release_year: numOrNull(formData.get("release_year")),
    reels: strOrNull(formData.get("reels")),
    paylines: strOrNull(formData.get("paylines")),
    bet_range: strOrNull(formData.get("bet_range")),
    intro: strOrNull(formData.get("intro")),
    mechanics: strOrNull(formData.get("mechanics")),
    bonus_features: parseLines(formData.get("bonus_features")),
    demo_url: strOrNull(formData.get("demo_url")),
    faq: parseFaq(formData.get("faq")),
  };
}

/** Demo URL (optional) must be https + on the approved host allowlist. */
const DEMO_URL_ERROR =
  "URL demo invalid — trebuie https și pe lista de domenii aprobate (src/lib/demo.ts). Lasă gol dacă demo-ul nu e verificat.";

/** Sync casino_games from the game side: delete-all for this game, re-insert selection. */
async function syncCasinos(db: DB, gameId: string, casinoIds: string[]): Promise<void> {
  await db.from("casino_games").delete().eq("game_id", gameId);
  const unique = [...new Set(casinoIds.filter(Boolean))];
  if (unique.length) {
    await db.from("casino_games").insert(unique.map((casino_id) => ({ game_id: gameId, casino_id })));
  }
}

function refresh() {
  // games listing/detail + homepage (tag 'games'); provider pages incl. game_count
  // (tag 'providers'); casino pages embed their games (tag 'casinos').
  updateTag("games");
  updateTag("casinos");
  updateTag("providers");
}

export async function createGame(
  _prev: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const db = await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug invalid — doar litere mici, cifre și cratime (ex. sweet-bonanza)." };
  }
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };
  if (!fields.provider_id) return { error: "Selectează un furnizor." };
  if (!fields.category_id) return { error: "Selectează o categorie." };
  if (fields.demo_url && !isAllowedDemoUrl(fields.demo_url)) return { error: DEMO_URL_ERROR };

  const { data: dup } = await db.from("games").select("id").eq("slug", slug).maybeSingle();
  if (dup) return { error: "Există deja un joc cu acest slug." };

  const { data: inserted, error } = await db
    .from("games")
    .insert({ slug, ...fields })
    .select("id")
    .single();
  if (error || !inserted) {
    if (error?.code === "23505") return { error: "Există deja un joc cu acest slug." };
    return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };
  }

  await syncCasinos(db, (inserted as { id: string }).id, formData.getAll("casinoIds").map(String));

  await logActivity(db, { action: "game.create", entityType: "game", entityId: (inserted as { id: string }).id, label: fields.name });
  refresh();
  redirect("/admin/jocuri");
}

export async function updateGame(
  id: string,
  _prev: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  const db = await requireAdmin();
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };
  if (!fields.provider_id) return { error: "Selectează un furnizor." };
  if (!fields.category_id) return { error: "Selectează o categorie." };
  if (fields.demo_url && !isAllowedDemoUrl(fields.demo_url)) return { error: DEMO_URL_ERROR };

  // slug is read-only at edit. provider change → trigger recalcs game_count for
  // both the old and the new provider automatically.
  const { error } = await db.from("games").update(fields).eq("id", id);
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  await syncCasinos(db, id, formData.getAll("casinoIds").map(String));

  await logActivity(db, { action: "game.update", entityType: "game", entityId: id, label: fields.name });
  refresh();
  redirect("/admin/jocuri");
}

export async function setGameStatus(id: string, next: ContentStatus): Promise<{ error?: string }> {
  const db = await requireAdmin();
  return applyStatusChange(db, {
    table: "games",
    id,
    next,
    entityType: "game",
    tags: ["games", "casinos", "providers"],
  });
}
