"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { applyStatusChange } from "@/lib/db/content-status";
import { validateJsonField } from "@/lib/io/validate";
import type { ContentStatus } from "@/lib/content-status";
import type { BonusFormState } from "./types";

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
/** Tri-state checkbox/select: "" → null (necunoscut), "true"/"false" → boolean. NULL ≠ false. */
function boolOrNull(v: FormDataEntryValue | null): boolean | null {
  const s = String(v ?? "").trim();
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
}
/** eligible_slots: linii → array; gol → NULL (NULL ≠ []). */
function linesOrNull(v: FormDataEntryValue | null): string[] | null {
  const a = String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  return a.length ? a : null;
}
/** reward_stages from the visual editor's hidden JSON input. Empty → NULL (NULL ≠ []). */
function parseRewardStages(v: FormDataEntryValue | null): { value: unknown; error: string | null } {
  const s = String(v ?? "").trim();
  if (!s) return { value: null, error: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    return { value: null, error: "Tranșe: JSON invalid." };
  }
  const res = validateJsonField("reward_stages", parsed);
  if (res.error) return { value: null, error: `Tranșe: ${res.error}` };
  const arr = res.value as unknown[];
  return { value: arr.length ? arr : null, error: null }; // 0 tranșe → NULL
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
    casino_id: strOrNull(formData.get("casino_id")),
    bonus_type_id: strOrNull(formData.get("bonus_type_id")),
    offer: String(formData.get("offer") ?? "").trim(),
    amount: strOrNull(formData.get("amount")),
    free_spins: numOrNull(formData.get("free_spins")),
    spin_value: numOrNull(formData.get("spin_value")),
    max_win: numOrNull(formData.get("max_win")),
    eligible_slots: linesOrNull(formData.get("eligible_slots")),
    wagering: strOrNull(formData.get("wagering")),
    wagering_multiplier: numOrNull(formData.get("wagering_multiplier")),
    wagering_basis: strOrNull(formData.get("wagering_basis")),
    code: strOrNull(formData.get("code")),
    min_deposit: strOrNull(formData.get("min_deposit")),
    validity: strOrNull(formData.get("validity")),
    kyc_required: boolOrNull(formData.get("kyc_required")),
    terms_url: strOrNull(formData.get("terms_url")),
    verified_at: strOrNull(formData.get("verified_at")),
    expires_at: strOrNull(formData.get("expires_at")),
    intro: strOrNull(formData.get("intro")),
    terms: parseLines(formData.get("terms")),
    pros: parseLines(formData.get("pros")),
    cons: parseLines(formData.get("cons")),
    how_to_claim: parseLines(formData.get("how_to_claim")),
    faq: parseFaq(formData.get("faq")),
  };
}

/** Non-negativity + terms_url shape guard for the new fields (DB CHECK is the backstop). */
function validateNewFields(f: ReturnType<typeof parseFields>): string | null {
  for (const [v, label] of [
    [f.spin_value, "Valoarea rotirii"],
    [f.max_win, "Câștig maxim"],
    [f.wagering_multiplier, "Multiplicator rulaj"],
    [f.free_spins, "Free spins"],
  ] as const) {
    if (v != null && v < 0) return `${label} nu poate fi negativ.`;
  }
  if (f.terms_url && !/^https?:\/\/\S+$/.test(f.terms_url)) return "URL termeni invalid (http(s)://).";
  return null;
}

/** claim_url is derived from the selected casino's slug → /go/<casino-slug>. */
async function deriveClaimUrl(db: DB, casinoId: string): Promise<string | null> {
  const { data } = await db.from("casinos").select("slug").eq("id", casinoId).maybeSingle();
  const slug = (data as { slug: string } | null)?.slug;
  return slug ? `/go/${slug}` : null;
}

function refresh() {
  // Bonus data drives /bonusuri-casino + homepage/sidebar (tag 'bonuses'),
  // and the casino cards embed the bonus offer/free_spins (tag 'casinos').
  updateTag("bonuses");
  updateTag("casinos");
}

export async function createBonus(
  _prev: BonusFormState,
  formData: FormData,
): Promise<BonusFormState> {
  const db = await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug invalid — doar litere mici, cifre și cratime." };
  }
  const fields = parseFields(formData);
  if (!fields.casino_id) return { error: "Selectează un cazino." };
  if (!fields.offer) return { error: "Oferta este obligatorie." };
  const fieldErr = validateNewFields(fields);
  if (fieldErr) return { error: fieldErr };
  const stages = parseRewardStages(formData.get("reward_stages"));
  if (stages.error) return { error: stages.error };

  const { data: dup } = await db.from("bonuses").select("id").eq("slug", slug).maybeSingle();
  if (dup) return { error: "Există deja un bonus cu acest slug." };

  const claim_url = await deriveClaimUrl(db, fields.casino_id);

  const { error } = await db.from("bonuses").insert({ slug, claim_url, ...fields, reward_stages: stages.value });
  if (error) {
    if (error.code === "23505") return { error: "Există deja un bonus cu acest slug." };
    return { error: `Eroare la salvare: ${error.message}` };
  }

  await logActivity(db, { action: "bonus.create", entityType: "bonus", label: fields.offer });
  refresh();
  redirect("/admin/bonusuri");
}

export async function updateBonus(
  id: string,
  _prev: BonusFormState,
  formData: FormData,
): Promise<BonusFormState> {
  const db = await requireAdmin();
  const fields = parseFields(formData);
  if (!fields.casino_id) return { error: "Selectează un cazino." };
  if (!fields.offer) return { error: "Oferta este obligatorie." };
  const fieldErr = validateNewFields(fields);
  if (fieldErr) return { error: fieldErr };
  const stages = parseRewardStages(formData.get("reward_stages"));
  if (stages.error) return { error: stages.error };

  const claim_url = await deriveClaimUrl(db, fields.casino_id);

  const { error } = await db.from("bonuses").update({ claim_url, ...fields, reward_stages: stages.value }).eq("id", id);
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  await logActivity(db, { action: "bonus.update", entityType: "bonus", entityId: id, label: fields.offer });
  refresh();
  redirect("/admin/bonusuri");
}

export async function setBonusStatus(id: string, next: ContentStatus): Promise<{ error?: string }> {
  const db = await requireAdmin();
  return applyStatusChange(db, {
    table: "bonuses",
    id,
    next,
    entityType: "bonus",
    tags: ["bonuses", "casinos"],
  });
}
