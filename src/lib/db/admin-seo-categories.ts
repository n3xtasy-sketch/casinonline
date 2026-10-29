import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { CategoryNamespace, SeoCategory } from "@/lib/seo-categories";

/** Admin reads for SEO categories (all statuses; RLS gates to is_admin()). */

const COLS =
  "id, namespace, slug, name, description, meta_title, meta_description, h1, intro, body, faq, selector, status, sort_order, updated_at";

interface Row {
  id: string; namespace: string; slug: string; name: string; description: string | null;
  meta_title: string | null; meta_description: string | null; h1: string | null;
  intro: string | null; body: string | null; faq: { question: string; answer: string }[] | null;
  selector: string; status: string; sort_order: number; updated_at: string;
}
function map(r: Row): SeoCategory {
  return {
    id: r.id, namespace: r.namespace as CategoryNamespace, slug: r.slug, name: r.name,
    description: r.description, metaTitle: r.meta_title, metaDescription: r.meta_description,
    h1: r.h1, intro: r.intro, body: r.body, faq: r.faq ?? [], selector: r.selector,
    status: r.status as SeoCategory["status"], sortOrder: r.sort_order, updatedAt: r.updated_at,
  };
}

export async function listCategories(): Promise<SeoCategory[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("seo_categories").select(COLS).order("namespace").order("sort_order").order("slug");
  if (error) throw new Error(`listCategories: ${error.message}`);
  return ((data as unknown as Row[]) ?? []).map(map);
}

export async function getCategoryById(id: string): Promise<SeoCategory | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("seo_categories").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getCategoryById: ${error.message}`);
  return data ? map(data as unknown as Row) : null;
}
