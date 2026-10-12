"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { applyStatusChange } from "@/lib/db/content-status";
import type { ContentStatus } from "@/lib/content-status";
import type { CasinoFormState } from "./types";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Server-side admin gate (defense in depth alongside RLS). */
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
    logo_url: strOrNull(formData.get("logo_url")),
    rating: numOrNull(formData.get("rating")),
    editor_score: numOrNull(formData.get("editor_score")),
    license: strOrNull(formData.get("license")),
    payout_speed: strOrNull(formData.get("payout_speed")),
    withdrawal_time: strOrNull(formData.get("withdrawal_time")),
    verified_at: strOrNull(formData.get("verified_at")),
    min_deposit: strOrNull(formData.get("min_deposit")),
    kyc: strOrNull(formData.get("kyc")),
    support: strOrNull(formData.get("support")),
    mobile: strOrNull(formData.get("mobile")),
    intro: strOrNull(formData.get("intro")),
    editor_review: strOrNull(formData.get("editor_review")),
    pros: parseLines(formData.get("pros")),
    cons: parseLines(formData.get("cons")),
    faq: parseFaq(formData.get("faq")),
  };
}

async function syncJunction(
  db: DB,
  table: string,
  column: string,
  casinoId: string,
  ids: string[],
): Promise<void> {
  await db.from(table).delete().eq("casino_id", casinoId);
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length) {
    await db.from(table).insert(unique.map((id) => ({ casino_id: casinoId, [column]: id })));
  }
}

async function upsertAffiliate(db: DB, casinoId: string, url: string | null): Promise<void> {
  if (!url) return;
  const { data: existing } = await db
    .from("affiliate_links")
    .select("id")
    .eq("casino_id", casinoId)
    .eq("placement", "review_cta")
    .maybeSingle();
  const row = existing as { id: string } | null;
  if (row) {
    await db.from("affiliate_links").update({ url, is_active: true }).eq("id", row.id);
  } else {
    await db
      .from("affiliate_links")
      .insert({ casino_id: casinoId, placement: "review_cta", url, is_active: true });
  }
}

export async function createCasino(
  _prev: CasinoFormState,
  formData: FormData,
): Promise<CasinoFormState> {
  const db = await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug invalid — doar litere mici, cifre și cratime (ex. betano-casino)." };
  }
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };

  const { data: dup } = await db.from("casinos").select("id").eq("slug", slug).maybeSingle();
  if (dup) return { error: "Există deja un cazino cu acest slug." };

  const { data: inserted, error } = await db
    .from("casinos")
    .insert({ slug, offer_url: `/go/${slug}`, ...fields })
    .select("id")
    .single();
  if (error || !inserted) {
    if (error?.code === "23505") return { error: "Există deja un cazino cu acest slug." };
    return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };
  }
  const casinoId = (inserted as { id: string }).id;

  await syncJunction(db, "casino_tags", "tag_id", casinoId, formData.getAll("tagIds").map(String));
  await syncJunction(db, "casino_payment_methods", "payment_method_id", casinoId, formData.getAll("paymentMethodIds").map(String));
  await syncJunction(db, "casino_games", "game_id", casinoId, formData.getAll("gameIds").map(String));
  await upsertAffiliate(db, casinoId, strOrNull(formData.get("affiliateUrl")));

  await logActivity(db, { action: "casino.create", entityType: "casino", entityId: casinoId, label: fields.name });
  updateTag("casinos");
  redirect("/admin/cazinouri");
}

/**
 * Archive / reactivate a casino (soft-delete). No physical delete. Refreshes the
 * casino surfaces AND bonuses (archived casino's bonuses drop from public listings).
 */
export async function setCasinoStatus(
  id: string,
  next: ContentStatus,
): Promise<{ error?: string }> {
  const db = await requireAdmin();
  return applyStatusChange(db, {
    table: "casinos",
    id,
    next,
    entityType: "casino",
    tags: ["casinos", "bonuses"],
  });
}

export async function updateCasino(
  id: string,
  slug: string,
  _prev: CasinoFormState,
  formData: FormData,
): Promise<CasinoFormState> {
  const db = await requireAdmin();
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };

  // slug is read-only at edit → reuse the existing slug (offer_url stays /go/<slug>).
  const { error } = await db
    .from("casinos")
    .update({ offer_url: `/go/${slug}`, ...fields })
    .eq("id", id);
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  await syncJunction(db, "casino_tags", "tag_id", id, formData.getAll("tagIds").map(String));
  await syncJunction(db, "casino_payment_methods", "payment_method_id", id, formData.getAll("paymentMethodIds").map(String));
  await syncJunction(db, "casino_games", "game_id", id, formData.getAll("gameIds").map(String));
  await upsertAffiliate(db, id, strOrNull(formData.get("affiliateUrl")));

  await logActivity(db, { action: "casino.update", entityType: "casino", entityId: id, label: fields.name });
  updateTag("casinos");
  redirect("/admin/cazinouri");
}
