"use server";

import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import type { BulkResult } from "@/lib/bulk";

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

function refreshCasinos() {
  updateTag("casinos");
  updateTag("bonuses");
}

async function setStatus(
  ids: string[],
  status: "active" | "archived",
  action: string,
): Promise<BulkResult> {
  const db = await requireAdmin();
  if (!ids.length) return { ok: 0, failed: [] };
  // Single atomic statement — all-or-nothing, no partial state.
  const { error } = await db.from("casinos").update({ status }).in("id", ids);
  if (error) return { ok: 0, failed: ids.map((id) => ({ id, reason: error.message })) };
  await logActivity(db, { action, entityType: "casino", label: `${ids.length} cazinouri`, metadata: { count: ids.length } });
  refreshCasinos();
  return { ok: ids.length, failed: [] };
}

export async function bulkArchiveCasinos(ids: string[]): Promise<BulkResult> {
  return setStatus(ids, "archived", "casino.bulk_archive");
}
export async function bulkActivateCasinos(ids: string[]): Promise<BulkResult> {
  return setStatus(ids, "active", "casino.bulk_activate");
}

export async function bulkAddTag(ids: string[], tagId: string): Promise<BulkResult> {
  const db = await requireAdmin();
  if (!ids.length) return { ok: 0, failed: [] };
  if (!tagId) return { ok: 0, failed: ids.map((id) => ({ id, reason: "Niciun tag selectat." })) };
  const rows = ids.map((casino_id) => ({ casino_id, tag_id: tagId }));
  const { error } = await db
    .from("casino_tags")
    .upsert(rows, { onConflict: "casino_id,tag_id", ignoreDuplicates: true });
  if (error) return { ok: 0, failed: ids.map((id) => ({ id, reason: error.message })) };
  await logActivity(db, { action: "casino.bulk_add_tag", entityType: "casino", label: `${ids.length} cazinouri`, metadata: { count: ids.length, tagId } });
  updateTag("casinos");
  return { ok: ids.length, failed: [] };
}

export async function bulkRemoveTag(ids: string[], tagId: string): Promise<BulkResult> {
  const db = await requireAdmin();
  if (!ids.length) return { ok: 0, failed: [] };
  if (!tagId) return { ok: 0, failed: ids.map((id) => ({ id, reason: "Niciun tag selectat." })) };
  const { error } = await db
    .from("casino_tags")
    .delete()
    .in("casino_id", ids)
    .eq("tag_id", tagId);
  if (error) return { ok: 0, failed: ids.map((id) => ({ id, reason: error.message })) };
  await logActivity(db, { action: "casino.bulk_remove_tag", entityType: "casino", label: `${ids.length} cazinouri`, metadata: { count: ids.length, tagId } });
  updateTag("casinos");
  return { ok: ids.length, failed: [] };
}
