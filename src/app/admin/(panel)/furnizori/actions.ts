"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import type { ProviderFormState } from "./types";

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

/** Editorial fields only — game_count is NEVER written here (owned by 0008 trigger). */
function parseFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    logo_url: strOrNull(formData.get("logo_url")),
    category: strOrNull(formData.get("category")),
    founded: numOrNull(formData.get("founded")),
    country: strOrNull(formData.get("country")),
    specialty: strOrNull(formData.get("specialty")),
    rtp_range: strOrNull(formData.get("rtp_range")),
    intro: strOrNull(formData.get("intro")),
    faq: parseFaq(formData.get("faq")),
  };
}

function refresh() {
  // provider listing/detail + homepage (tag 'providers'); game cards/detail embed
  // the provider name, so renaming must refresh them too (tag 'games').
  updateTag("providers");
  updateTag("games");
}

export async function createProvider(
  _prev: ProviderFormState,
  formData: FormData,
): Promise<ProviderFormState> {
  const db = await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug invalid — doar litere mici, cifre și cratime (ex. pragmatic-play)." };
  }
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };

  const { data: dup } = await db.from("providers").select("id").eq("slug", slug).maybeSingle();
  if (dup) return { error: "Există deja un furnizor cu acest slug." };

  // New provider has no games yet; game_count seeds at 0 and is kept in sync by
  // the 0008 trigger as games get assigned to this provider.
  const { error } = await db.from("providers").insert({ slug, game_count: 0, ...fields });
  if (error) {
    if (error.code === "23505") return { error: "Există deja un furnizor cu acest slug." };
    return { error: `Eroare la salvare: ${error.message}` };
  }

  await logActivity(db, { action: "provider.create", entityType: "provider", label: fields.name });
  refresh();
  redirect("/admin/furnizori");
}

export async function updateProvider(
  id: string,
  _prev: ProviderFormState,
  formData: FormData,
): Promise<ProviderFormState> {
  const db = await requireAdmin();
  const fields = parseFields(formData);
  if (!fields.name) return { error: "Numele este obligatoriu." };

  // slug is read-only at edit; game_count is left untouched (owned by trigger).
  const { error } = await db.from("providers").update(fields).eq("id", id);
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  await logActivity(db, { action: "provider.update", entityType: "provider", entityId: id, label: fields.name });
  refresh();
  redirect("/admin/furnizori");
}
