"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { isSafeInternalPath } from "@/lib/guide-format";
import { SEO_TYPES, type SeoType } from "@/lib/seo";
import type { SeoFormState } from "./types";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

const ENTITY_TAG: Record<SeoType, string> = {
  casino: "casinos",
  game: "games",
  provider: "providers",
  payment_method: "payments",
  bonus: "bonuses",
  guide: "guides",
};

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

export async function saveSeo(
  type: SeoType,
  id: string,
  _prev: SeoFormState,
  formData: FormData,
): Promise<SeoFormState> {
  const db = await requireAdmin();
  if (!SEO_TYPES.includes(type)) return { error: "Tip entitate invalid." };

  const canonical = strOrNull(formData.get("canonical"));
  if (canonical && !isSafeInternalPath(canonical)) {
    return { error: "Canonical invalid — trebuie să fie o rută internă (ex. /cazinouri-online/nume)." };
  }

  const row = {
    entity_type: type,
    entity_id: id,
    meta_title: strOrNull(formData.get("meta_title")),
    meta_description: strOrNull(formData.get("meta_description")),
    canonical,
    robots_index: formData.get("robots_index") === "on",
    robots_follow: formData.get("robots_follow") === "on",
    og_title: strOrNull(formData.get("og_title")),
    og_description: strOrNull(formData.get("og_description")),
    og_image: strOrNull(formData.get("og_image")),
  };

  const { error } = await db
    .from("seo_metadata")
    .upsert(row, { onConflict: "entity_type,entity_id" });
  if (error) return { error: `Eroare la salvare: ${error.message}` };

  await logActivity(db, { action: "seo.save", entityType: "seo", entityId: id, label: type });
  updateTag("seo");
  updateTag(ENTITY_TAG[type]);
  redirect("/admin/seo");
}

/** Reset = clear all overrides back to pure fallback (no physical delete of the row). */
export async function resetSeo(type: SeoType, id: string): Promise<void> {
  const db = await requireAdmin();
  const { error } = await db
    .from("seo_metadata")
    .upsert(
      {
        entity_type: type,
        entity_id: id,
        meta_title: null,
        meta_description: null,
        canonical: null,
        robots_index: true,
        robots_follow: true,
        og_title: null,
        og_description: null,
        og_image: null,
      },
      { onConflict: "entity_type,entity_id" },
    );
  if (error) throw new Error(`Eroare la reset: ${error.message}`);
  await logActivity(db, { action: "seo.reset", entityType: "seo", entityId: id, label: type });
  updateTag("seo");
  updateTag(ENTITY_TAG[type]);
  redirect("/admin/seo");
}
