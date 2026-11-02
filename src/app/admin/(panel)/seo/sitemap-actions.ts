"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { revalidateSitemapAll } from "@/lib/revalidate-sitemap";

/**
 * Manual sitemap revalidation — for changes made OUTSIDE the CMS (e.g. a direct SQL UPDATE that
 * bypasses the per-mutation updateTag/revalidatePath, like the casino-slug migration). Admin-gated.
 * Purges every sitemap data tag + regenerates the prerendered /sitemap.xml route.
 */
export async function revalidateSitemapAction(): Promise<{ ok: true } | { error: string }> {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Neautentificat." };
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return { error: "Acces interzis." };

  try {
    revalidateSitemapAll();
  } catch (e) {
    return { error: `Revalidare eșuată: ${e instanceof Error ? e.message : "eroare necunoscută"}` };
  }
  await logActivity(db, { action: "sitemap.revalidate", entityType: "sitemap", entityId: null });
  return { ok: true };
}
