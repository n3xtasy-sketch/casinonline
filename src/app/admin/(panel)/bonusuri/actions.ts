"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
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
    free_spins: numOrNull(formData.get("free_spins")),
    wagering: strOrNull(formData.get("wagering")),
    code: strOrNull(formData.get("code")),
    min_deposit: strOrNull(formData.get("min_deposit")),
    validity: strOrNull(formData.get("validity")),
    intro: strOrNull(formData.get("intro")),
    terms: parseLines(formData.get("terms")),
    pros: parseLines(formData.get("pros")),
    cons: parseLines(formData.get("cons")),
    how_to_claim: parseLines(formData.get("how_to_claim")),
    faq: parseFaq(formData.get("faq")),
  };
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

  const { data: dup } = await db.from("bonuses").select("id").eq("slug", slug).maybeSingle();
  if (dup) return { error: "Există deja un bonus cu acest slug." };

  const claim_url = await deriveClaimUrl(db, fields.casino_id);

  const { error } = await db.from("bonuses").insert({ slug, claim_url, ...fields });
  if (error) {
    if (error.code === "23505") return { error: "Există deja un bonus cu acest slug." };
    return { error: `Eroare la salvare: ${error.message}` };
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

  const claim_url = await deriveClaimUrl(db, fields.casino_id);

  const { error } = await db.from("bonuses").update({ claim_url, ...fields }).eq("id", id);
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  refresh();
  redirect("/admin/bonusuri");
}
