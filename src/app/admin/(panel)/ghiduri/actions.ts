"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { applyStatusChange } from "@/lib/db/content-status";
import type { ContentStatus } from "@/lib/content-status";
import { parseSections, parseRelatedLinks } from "@/lib/guide-format";
import { parseAuthorship, validateAuthorship } from "@/lib/editorial";
import type { GuideFormState } from "./types";

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

/** Parse + validate the editorial fields. Returns an error message when invalid. */
function parseFields(
  formData: FormData,
): { fields: Record<string, unknown>; error: string | null } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { fields: {}, error: "Titlul este obligatoriu." };

  const category_id = strOrNull(formData.get("category_id"));
  if (!category_id) return { fields: {}, error: "Selectează o categorie." };

  const { sections, error: secErr } = parseSections(String(formData.get("sections") ?? ""));
  if (secErr) return { fields: {}, error: secErr };

  const { links, invalid } = parseRelatedLinks(String(formData.get("related_links") ?? ""));
  if (invalid.length) {
    return {
      fields: {},
      error: `Linkuri externe/invalide respinse (doar rute interne „/…"): ${invalid.join(", ")}`,
    };
  }

  const publishedRaw = strOrNull(formData.get("published_at"));

  return {
    fields: {
      title,
      category_id,
      excerpt: strOrNull(formData.get("excerpt")),
      image_url: strOrNull(formData.get("image_url")),
      author: strOrNull(formData.get("author")),
      intro: strOrNull(formData.get("intro")),
      reading_time: strOrNull(formData.get("reading_time")),
      sections,
      related_links: links,
      faq: parseFaq(formData.get("faq")),
      published_at: publishedRaw ? new Date(publishedRaw).toISOString() : null,
    },
    error: null,
  };
}

export async function createGuide(
  _prev: GuideFormState,
  formData: FormData,
): Promise<GuideFormState> {
  const db = await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug invalid — doar litere mici, cifre și cratime (ex. ghid-rulaj)." };
  }
  const { fields, error } = parseFields(formData);
  if (error) return { error };
  const authorship = parseAuthorship(formData);
  const authorErr = validateAuthorship(authorship.input);
  if (authorErr) return { error: authorErr };

  const { data: dup } = await db.from("guides").select("id").eq("slug", slug).maybeSingle();
  if (dup) return { error: "Există deja un ghid cu acest slug." };

  const { error: insErr } = await db
    .from("guides")
    .insert({ slug, ...authorship.dbRow, ...fields, updated_at: new Date().toISOString() });
  if (insErr) {
    if (insErr.code === "23505") return { error: "Există deja un ghid cu acest slug." };
    return { error: `Eroare la salvare: ${insErr.message}` };
  }

  await logActivity(db, { action: "guide.create", entityType: "guide", label: String(fields.title ?? "") });
  updateTag("guides");
  redirect("/admin/ghiduri");
}

export async function updateGuide(
  id: string,
  _prev: GuideFormState,
  formData: FormData,
): Promise<GuideFormState> {
  const db = await requireAdmin();
  const { fields, error } = parseFields(formData);
  if (error) return { error };
  const authorship = parseAuthorship(formData);
  const authorErr = validateAuthorship(authorship.input);
  if (authorErr) return { error: authorErr };

  // slug is read-only at edit; updated_at is re-stamped on every save.
  const { error: updErr } = await db
    .from("guides")
    .update({ ...authorship.dbRow, ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) return { error: `Eroare la salvare: ${updErr.message}` };

  await logActivity(db, { action: "guide.update", entityType: "guide", entityId: id, label: String(fields.title ?? "") });
  updateTag("guides");
  redirect("/admin/ghiduri");
}

export async function setGuideStatus(id: string, next: ContentStatus): Promise<{ error?: string }> {
  const db = await requireAdmin();
  return applyStatusChange(db, {
    table: "guides",
    id,
    next,
    entityType: "guide",
    tags: ["guides"],
    stampPublishedAt: true,
  });
}
