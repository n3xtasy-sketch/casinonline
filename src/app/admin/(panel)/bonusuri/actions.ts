"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { applyStatusChange } from "@/lib/db/content-status";
import { validateJsonField } from "@/lib/io/validate";
import { PLACEMENT_VALUES } from "@/lib/affiliate-placements";
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

/** claim_url is the per-bonus deep link: /go/<casino-slug>/<bonus-slug>. */
async function deriveClaimUrl(db: DB, casinoId: string, bonusSlug: string): Promise<string | null> {
  const { data } = await db.from("casinos").select("slug").eq("id", casinoId).maybeSingle();
  const cslug = (data as { slug: string } | null)?.slug;
  return cslug && bonusSlug ? `/go/${cslug}/${bonusSlug}` : null;
}

/* ── affiliate link assignment (Etapa 2) ───────────────────────────────────────
 * The CTA link is chosen in the form via link_mode:
 *   "main"     → affiliate_link_id = NULL (fall back to the casino's main link)
 *   "existing" → affiliate_link_id = a chosen ACTIVE link of the SAME casino
 *   "new"      → create a link inline + assign atomically via the 0031 RPC
 * Same-casino is enforced at the DB (composite FK 0028) + re-checked server-side. */
type Assignment =
  | { mode: "main" }
  | { mode: "existing"; id: string }
  | { mode: "new"; url: string; placement: string; campaign: string | null };

function parseAssignment(formData: FormData): { value: Assignment | null; error: string | null } {
  const mode = String(formData.get("link_mode") ?? "main");
  if (mode === "main") return { value: { mode: "main" }, error: null };
  if (mode === "existing") {
    const id = String(formData.get("affiliate_link_id") ?? "").trim();
    if (!id) return { value: null, error: "Selectează un link existent sau alege linkul principal." };
    return { value: { mode: "existing", id }, error: null };
  }
  if (mode === "new") {
    const url = String(formData.get("new_link_url") ?? "").trim();
    if (!/^https:\/\/\S+$/.test(url)) {
      return { value: null, error: "URL link nou invalid — trebuie să înceapă cu https://" };
    }
    const placement = String(formData.get("new_link_placement") ?? "bonus_claim").trim();
    if (!PLACEMENT_VALUES.includes(placement)) {
      return { value: null, error: "Placement invalid pentru linkul nou." };
    }
    const campaign = String(formData.get("new_link_campaign") ?? "").trim() || null;
    return { value: { mode: "new", url, placement, campaign }, error: null };
  }
  return { value: null, error: "Mod link invalid." };
}

/** Validate a chosen existing link: must exist, be the same casino, and be active. */
async function validateExistingLink(db: DB, casinoId: string, id: string): Promise<string | null> {
  const { data } = await db
    .from("affiliate_links")
    .select("casino_id, is_active")
    .eq("id", id)
    .maybeSingle();
  const r = data as { casino_id: string; is_active: boolean } | null;
  if (!r) return "Linkul selectat nu există.";
  if (r.casino_id !== casinoId) return "Linkul selectat aparține altui cazino.";
  if (!r.is_active) return "Linkul selectat este inactiv. Activează-l sau alege altul.";
  return null;
}

/** Atomic inline create + assign via the 0031 RPC. Returns an error message or null. */
async function assignNewLink(
  db: DB,
  bonusId: string,
  casinoId: string,
  link: { url: string; placement: string; campaign: string | null },
): Promise<string | null> {
  const { error } = await db.rpc("create_bonus_affiliate_link", {
    p_bonus_id: bonusId,
    p_casino_id: casinoId,
    p_url: link.url,
    p_placement: link.placement,
    p_campaign: link.campaign,
  });
  return error ? error.message : null;
}

/** Live CTA preview: the resolver reflects the SAVED DB state (migration 0029). */
export async function previewBonusCta(
  casinoSlug: string,
  bonusSlug: string,
): Promise<{ url: string | null }> {
  const db = await requireAdmin();
  const { data } = await db.rpc("get_bonus_affiliate_url", {
    p_casino_slug: casinoSlug,
    p_bonus_slug: bonusSlug,
  });
  return { url: typeof data === "string" ? data : null };
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
  const assign = parseAssignment(formData);
  if (assign.error || !assign.value) return { error: assign.error ?? "Date link invalide." };
  const a = assign.value;
  if (a.mode === "existing") {
    const linkErr = await validateExistingLink(db, fields.casino_id, a.id);
    if (linkErr) return { error: linkErr };
  }

  const { data: dup } = await db.from("bonuses").select("id").eq("slug", slug).maybeSingle();
  if (dup) return { error: "Există deja un bonus cu acest slug." };

  const claim_url = await deriveClaimUrl(db, fields.casino_id, slug);
  // #8 save the bonus FIRST; mode "new" starts NULL and gets its link via the atomic RPC.
  const affiliate_link_id = a.mode === "existing" ? a.id : null;

  const { data: inserted, error } = await db
    .from("bonuses")
    .insert({ slug, claim_url, affiliate_link_id, ...fields, reward_stages: stages.value })
    .select("id")
    .single();
  if (error || !inserted) {
    if (error?.code === "23505") return { error: "Există deja un bonus cu acest slug." };
    return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };
  }
  const bonusId = (inserted as { id: string }).id;

  await logActivity(db, { action: "bonus.create", entityType: "bonus", entityId: bonusId, label: fields.offer });

  // #9 if the atomic link assignment fails, the bonus is already saved → say so explicitly.
  if (a.mode === "new") {
    const linkErr = await assignNewLink(db, bonusId, fields.casino_id, a);
    if (linkErr) {
      refresh();
      return {
        error: `Bonusul a fost salvat, dar asocierea linkului nou a eșuat: ${linkErr}. Bonusul folosește deocamdată linkul principal al cazinoului — editează-l pentru a reîncerca.`,
      };
    }
  }

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
  const assign = parseAssignment(formData);
  if (assign.error || !assign.value) return { error: assign.error ?? "Date link invalide." };
  const a = assign.value;
  if (a.mode === "existing") {
    const linkErr = await validateExistingLink(db, fields.casino_id, a.id);
    if (linkErr) return { error: linkErr };
  }

  // slug is read-only at edit → fetch it to build the per-bonus /go/<casino>/<bonus> link.
  const { data: cur } = await db.from("bonuses").select("slug").eq("id", id).maybeSingle();
  const bonusSlug = (cur as { slug: string } | null)?.slug ?? "";
  const claim_url = await deriveClaimUrl(db, fields.casino_id, bonusSlug);

  // modes "main"/"existing" set affiliate_link_id directly; "new" is assigned via the RPC after.
  const base = { claim_url, ...fields, reward_stages: stages.value };
  const patch =
    a.mode === "new" ? base : { ...base, affiliate_link_id: a.mode === "existing" ? a.id : null };

  const { error } = await db.from("bonuses").update(patch).eq("id", id);
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  await logActivity(db, { action: "bonus.update", entityType: "bonus", entityId: id, label: fields.offer });

  // #9 bonus already updated; if the atomic link assignment fails, say so explicitly.
  if (a.mode === "new") {
    const linkErr = await assignNewLink(db, id, fields.casino_id, a);
    if (linkErr) {
      refresh();
      return {
        error: `Bonusul a fost salvat, dar asocierea linkului nou a eșuat: ${linkErr}. Asocierea anterioară a rămas neschimbată — reîncearcă.`,
      };
    }
  }

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
