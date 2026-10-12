"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { applyStatusChange } from "@/lib/db/content-status";
import type { ContentStatus } from "@/lib/content-status";
import type { PaymentFormState } from "./types";

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
    payment_type_id: strOrNull(formData.get("payment_type_id")),
    deposit_speed: strOrNull(formData.get("deposit_speed")),
    withdrawal_speed: strOrNull(formData.get("withdrawal_speed")),
    fees: strOrNull(formData.get("fees")),
    min_limit: strOrNull(formData.get("min_limit")),
    max_limit: strOrNull(formData.get("max_limit")),
    intro: strOrNull(formData.get("intro")),
    deposits: strOrNull(formData.get("deposits")),
    withdrawals: strOrNull(formData.get("withdrawals")),
    pros: parseLines(formData.get("pros")),
    cons: parseLines(formData.get("cons")),
    faq: parseFaq(formData.get("faq")),
  };
}

/** Sync casino_payment_methods from the method side: delete-all for this method, re-insert. */
async function syncCasinos(db: DB, methodId: string, casinoIds: string[]): Promise<void> {
  await db.from("casino_payment_methods").delete().eq("payment_method_id", methodId);
  const unique = [...new Set(casinoIds.filter(Boolean))];
  if (unique.length) {
    await db
      .from("casino_payment_methods")
      .insert(unique.map((casino_id) => ({ payment_method_id: methodId, casino_id })));
  }
}

function refresh() {
  // payments listing/detail (tag 'payments'); casino cards/pages list accepted
  // methods, so changes must refresh them too (tag 'casinos').
  updateTag("payments");
  updateTag("casinos");
}

export async function createPaymentMethod(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const db = await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug invalid — doar litere mici, cifre și cratime (ex. apple-pay)." };
  }
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };
  if (!fields.payment_type_id) return { error: "Selectează tipul metodei." };

  const { data: dup } = await db
    .from("payment_methods")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (dup) return { error: "Există deja o metodă cu acest slug." };

  const { data: inserted, error } = await db
    .from("payment_methods")
    .insert({ slug, ...fields })
    .select("id")
    .single();
  if (error || !inserted) {
    if (error?.code === "23505") return { error: "Există deja o metodă cu acest slug." };
    return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };
  }

  await syncCasinos(db, (inserted as { id: string }).id, formData.getAll("casinoIds").map(String));

  await logActivity(db, { action: "payment.create", entityType: "payment_method", entityId: (inserted as { id: string }).id, label: fields.name });
  refresh();
  redirect("/admin/metode-de-plata");
}

export async function updatePaymentMethod(
  id: string,
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const db = await requireAdmin();
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };
  if (!fields.payment_type_id) return { error: "Selectează tipul metodei." };

  // slug is read-only at edit.
  const { error } = await db.from("payment_methods").update(fields).eq("id", id);
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  await syncCasinos(db, id, formData.getAll("casinoIds").map(String));

  await logActivity(db, { action: "payment.update", entityType: "payment_method", entityId: id, label: fields.name });
  refresh();
  redirect("/admin/metode-de-plata");
}

export async function setPaymentStatus(id: string, next: ContentStatus): Promise<{ error?: string }> {
  const db = await requireAdmin();
  return applyStatusChange(db, {
    table: "payment_methods",
    id,
    next,
    entityType: "payment",
    tags: ["payments", "casinos"],
  });
}
