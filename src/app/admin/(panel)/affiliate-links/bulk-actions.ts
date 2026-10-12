"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
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

// No updateTag: /go resolves live via the RPC; nothing cached depends on these.

export async function bulkDeactivateAffiliate(ids: string[]): Promise<BulkResult> {
  const db = await requireAdmin();
  if (!ids.length) return { ok: 0, failed: [] };
  // Deactivation never conflicts → single atomic statement.
  const { error } = await db.from("affiliate_links").update({ is_active: false }).in("id", ids);
  if (error) return { ok: 0, failed: ids.map((id) => ({ id, reason: error.message })) };
  return { ok: ids.length, failed: [] };
}

export async function bulkActivateAffiliate(ids: string[]): Promise<BulkResult> {
  const db = await requireAdmin();
  if (!ids.length) return { ok: 0, failed: [] };
  // Per-row: reactivation can hit the active-unique index (casino+placement+campaign).
  // Each row is independent — report conflicts individually, no global rollback.
  let ok = 0;
  const failed: { id: string; reason: string }[] = [];
  for (const id of ids) {
    const { error } = await db.from("affiliate_links").update({ is_active: true }).eq("id", id);
    if (error) {
      failed.push({
        id,
        reason:
          error.code === "23505"
            ? "Conflict: există deja un link activ pe același cazino + placement + campanie."
            : error.message,
      });
    } else {
      ok++;
    }
  }
  return { ok, failed };
}
