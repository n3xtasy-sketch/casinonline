import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { MEDIA_BUCKET } from "@/lib/media";

export interface MediaFile {
  name: string;
  path: string;
  url: string;
}

/** List files in a media folder (admin session). Newest first. */
export async function listMedia(folder: string): Promise<MediaFile[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.storage
    .from(MEDIA_BUCKET)
    .list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw new Error(`listMedia: ${error.message}`);
  return (data ?? [])
    .filter((o) => o.id !== null && o.name !== ".emptyFolderPlaceholder")
    .map((o) => {
      const path = `${folder}/${o.name}`;
      const { data: pub } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return { name: o.name, path, url: pub.publicUrl };
    });
}

export interface MediaUsage {
  label: string;
  href: string;
}

/**
 * Where a media URL is still referenced across entity image columns.
 * Used to warn before deleting a file (reference-protected delete).
 */
export async function findMediaUsage(url: string): Promise<MediaUsage[]> {
  const db = await getSupabaseAuthClient();
  const checks: [string, string, string, string, string][] = [
    ["casinos", "logo_url", "name", "/admin/cazinouri", "Cazino"],
    ["providers", "logo_url", "name", "/admin/furnizori", "Furnizor"],
    ["payment_methods", "logo_url", "name", "/admin/metode-de-plata", "Metodă"],
    ["games", "thumbnail_url", "name", "/admin/jocuri", "Joc"],
    ["guides", "image_url", "title", "/admin/ghiduri", "Ghid"],
  ];
  const out: MediaUsage[] = [];
  for (const [table, col, nameField, prefix, typeLabel] of checks) {
    const { data } = await db.from(table).select(`slug, ${nameField}`).eq(col, url);
    for (const r of (data as unknown as Record<string, string>[]) ?? []) {
      out.push({ label: `${typeLabel}: ${r[nameField]}`, href: `${prefix}/${r.slug}/edit` });
    }
  }
  return out;
}
