import "server-only";
import { updateTag } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import type { ContentStatus } from "@/lib/content-status";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

export interface ApplyStatusOptions {
  table: string;
  id: string;
  next: ContentStatus;
  entityType: string;
  /** cache tags to invalidate (e.g. ["casinos","bonuses"]). */
  tags: string[];
  /** guides: stamp published_at = now() on the FIRST publish only. */
  stampPublishedAt?: boolean;
  label?: string | null;
}

/**
 * Internal shared status-change routine used by the per-entity public actions
 * (publish/unpublish/archive). Reads the previous status, applies the change,
 * logs the transition (from→to), and invalidates caches. Caller must be admin.
 */
export async function applyStatusChange(db: DB, opts: ApplyStatusOptions): Promise<{ error?: string }> {
  const cols = opts.stampPublishedAt ? "status, published_at" : "status";
  const { data: cur } = await db.from(opts.table).select(cols).eq("id", opts.id).maybeSingle();
  const row = cur as { status?: ContentStatus; published_at?: string | null } | null;
  const from = row?.status ?? null;

  const patch: Record<string, unknown> = { status: opts.next };
  if (opts.stampPublishedAt && opts.next === "published" && !row?.published_at) {
    patch.published_at = new Date().toISOString();
  }

  const { error } = await db.from(opts.table).update(patch).eq("id", opts.id);
  if (error) return { error: error.message };

  const verb = opts.next === "published" ? "publish" : opts.next === "draft" ? "unpublish" : "archive";
  await logActivity(db, {
    action: `${opts.entityType}.${verb}`,
    entityType: opts.entityType,
    entityId: opts.id,
    label: opts.label ?? null,
    metadata: { from, to: opts.next },
  });

  for (const t of opts.tags) updateTag(t);
  return {};
}
