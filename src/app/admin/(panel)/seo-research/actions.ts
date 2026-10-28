"use server";

import { redirect } from "next/navigation";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { validateProjectInput } from "@/lib/seo-research";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

export interface SeoProjectFormState {
  error: string | null;
}

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

export async function createSeoProject(
  _prev: SeoProjectFormState,
  formData: FormData,
): Promise<SeoProjectFormState> {
  const db = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const defaultCountry = (String(formData.get("default_country") ?? "").trim() || "ro").toLowerCase();

  const err = validateProjectInput({ name, defaultCountry });
  if (err) return { error: err };

  const {
    data: { user },
  } = await db.auth.getUser();

  const { data: inserted, error } = await db
    .from("seo_projects")
    .insert({ name, default_country: defaultCountry, created_by: user?.id ?? null })
    .select("id")
    .single();
  if (error || !inserted) return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };

  const id = (inserted as { id: string }).id;
  await logActivity(db, { action: "seo_project.create", entityType: "seo_project", entityId: id, label: name });
  redirect(`/admin/seo-research/${id}`);
}
