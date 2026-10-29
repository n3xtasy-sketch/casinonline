"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { validateCategoryInput } from "@/lib/seo-categories";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

export interface CategoryFormState {
  error: string | null;
}

/** FAQ textarea: one "question | answer" per line. */
function parseFaq(raw: string): { question: string; answer: string }[] {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf("|");
    return i === -1 ? { question: l, answer: "" } : { question: l.slice(0, i).trim(), answer: l.slice(i + 1).trim() };
  }).filter((f) => f.question && f.answer);
}

function parse(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    id: s("id") || null,
    namespace: s("namespace"),
    slug: s("slug").toLowerCase(),
    name: s("name"),
    selector: s("selector"),
    status: s("status") || "draft",
    description: s("description") || null,
    meta_title: s("meta_title") || null,
    meta_description: s("meta_description") || null,
    h1: s("h1") || null,
    intro: s("intro") || null,
    body: s("body") || null,
    faq: parseFaq(s("faq")),
    sort_order: Number(s("sort_order")) || 0,
  };
}

/** Friendly server-side collision pre-check (the DB trigger is the hard backstop). */
async function collision(db: DB, namespace: string, slug: string, selfId: string | null): Promise<string | null> {
  if (namespace === "game") {
    const { data } = await db.from("games").select("id").eq("slug", slug).maybeSingle();
    if (data) return `Slug „${slug}" este deja folosit de un joc.`;
  } else if (namespace === "casino") {
    const { data } = await db.from("casinos").select("id").eq("slug", slug).maybeSingle();
    if (data) return `Slug „${slug}" este deja folosit de un cazinou.`;
  }
  let q = db.from("seo_categories").select("id").eq("namespace", namespace).eq("slug", slug);
  if (selfId) q = q.neq("id", selfId);
  const { data: dup } = await q.maybeSingle();
  if (dup) return `Există deja o categorie „${namespace}/${slug}".`;
  return null;
}

export async function saveCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const db = await requireAdmin();
  const f = parse(formData);
  const vErr = validateCategoryInput(f);
  if (vErr) return { error: vErr };
  const cErr = await collision(db, f.namespace, f.slug, f.id);
  if (cErr) return { error: cErr };

  const row = {
    namespace: f.namespace, slug: f.slug, name: f.name, selector: f.selector, status: f.status,
    description: f.description, meta_title: f.meta_title, meta_description: f.meta_description,
    h1: f.h1, intro: f.intro, body: f.body, faq: f.faq, sort_order: f.sort_order,
  };

  let id = f.id;
  if (id) {
    const { error } = await db.from("seo_categories").update(row).eq("id", id);
    if (error) return { error: `Eroare la salvare: ${error.message}` };
  } else {
    const { data, error } = await db.from("seo_categories").insert(row).select("id").single();
    if (error || !data) return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };
    id = (data as { id: string }).id;
  }
  await logActivity(db, { action: f.id ? "seo_category.update" : "seo_category.create", entityType: "seo_category", entityId: id, label: `${f.namespace}/${f.slug}` });
  updateTag("seo_categories");
  redirect("/admin/seo-categories");
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await requireAdmin();
  const { error } = await db.from("seo_categories").delete().eq("id", id);
  if (error) throw new Error(`Ștergere eșuată: ${error.message}`);
  await logActivity(db, { action: "seo_category.delete", entityType: "seo_category", entityId: id });
  updateTag("seo_categories");
  redirect("/admin/seo-categories");
}
