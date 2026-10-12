"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { slugify } from "@/lib/guide-format";
import { MEDIA_BUCKET, isMediaFolder, MAX_UPLOAD_BYTES } from "@/lib/media";
import { listMedia, findMediaUsage, type MediaFile, type MediaUsage } from "@/lib/db/admin-media";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

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

export type UploadResult = { url: string; path: string } | { error: string };

/** Upload a (client-resized WebP) image to the media bucket. Admin-only via RLS. */
export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const db = await requireAdmin();

  const folder = String(formData.get("folder") ?? "");
  if (!isMediaFolder(folder)) return { error: "Folder invalid." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Niciun fișier." };
  if (file.type !== "image/webp") return { error: "Format neașteptat (se încarcă WebP)." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `Fișier prea mare (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` };
  }

  const rawName = String(formData.get("name") ?? "image").replace(/\.[^.]+$/, "");
  const base = slugify(rawName) || "image";
  const key = `${folder}/${base}-${crypto.randomUUID().slice(0, 8)}.webp`;

  const { error } = await db.storage
    .from(MEDIA_BUCKET)
    .upload(key, file, { contentType: "image/webp", upsert: false });
  if (error) return { error: `Eroare la upload: ${error.message}` };

  const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(key);
  return { url: data.publicUrl, path: key };
}

export async function listMediaAction(folder: string): Promise<MediaFile[]> {
  await requireAdmin();
  return listMedia(folder);
}

export type DeleteResult =
  | { ok: true }
  | { blocked: true; usage: MediaUsage[] }
  | { error: string };

/** Delete a media file. Blocked (unless force) when still referenced by an entity. */
export async function deleteMedia(path: string, force = false): Promise<DeleteResult> {
  const db = await requireAdmin();

  const { data: pub } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const usage = await findMediaUsage(pub.publicUrl);
  if (usage.length > 0 && !force) return { blocked: true, usage };

  const { error } = await db.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) return { error: `Eroare la ștergere: ${error.message}` };
  return { ok: true };
}
