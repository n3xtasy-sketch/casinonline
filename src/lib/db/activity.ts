import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

export interface ActivityEntry {
  action: string;
  entityType?: string;
  entityId?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Best-effort audit write. AWAITED by callers after the main mutation, but captures
 * its own errors and NEVER throws — a failed log must not roll back the business action.
 * Uses the caller's authed client; RLS requires actor_user_id = auth.uid().
 */
export async function logActivity(db: DB, entry: ActivityEntry): Promise<void> {
  try {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return;
    const { error } = await db.from("activity_log").insert({
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      label: entry.label ?? null,
      metadata: entry.metadata ?? null,
    });
    if (error) console.error("logActivity insert failed:", error.message);
  } catch (e) {
    console.error("logActivity failed:", e);
  }
}

/* --------------------------------- listing --------------------------------- */

export interface ActivityFilters {
  actor?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
}
export interface ActivityRow {
  id: string;
  createdAt: string;
  actorEmail: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  label: string | null;
}
export interface ActivityPage {
  rows: ActivityRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 50;

export async function listActivity(filters: ActivityFilters, page: number): Promise<ActivityPage> {
  const db = await getSupabaseAuthClient();
  const p = Math.max(1, page);
  let q = db
    .from("activity_log")
    .select("id, created_at, actor_email, action, entity_type, entity_id, label", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((p - 1) * PAGE_SIZE, p * PAGE_SIZE - 1);
  if (filters.actor) q = q.eq("actor_email", filters.actor);
  if (filters.action) q = q.eq("action", filters.action);
  if (filters.entity) q = q.eq("entity_type", filters.entity);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59`);

  const { data, error, count } = await q;
  if (error) throw new Error(`listActivity: ${error.message}`);
  const rows = (
    (data as unknown as {
      id: string;
      created_at: string;
      actor_email: string | null;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      label: string | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    actorEmail: r.actor_email ?? "—",
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    label: r.label,
  }));
  return { rows, total: count ?? 0, page: p, pageSize: PAGE_SIZE };
}

/** Distinct actor emails for the filter dropdown. */
export async function listActivityActors(): Promise<string[]> {
  const db = await getSupabaseAuthClient();
  const { data } = await db.from("activity_log").select("actor_email").not("actor_email", "is", null);
  const set = new Set(
    ((data as unknown as { actor_email: string }[]) ?? []).map((r) => r.actor_email),
  );
  return [...set].sort();
}
