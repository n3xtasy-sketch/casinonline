"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

async function assertProject(db: DB, projectId: string): Promise<string | null> {
  const { data } = await db.from("seo_projects").select("id").eq("id", projectId).maybeSingle();
  return data ? null : "Proiect inexistent sau inaccesibil.";
}

async function assertCluster(db: DB, projectId: string, clusterId: string): Promise<string | null> {
  const { data } = await db.from("seo_clusters").select("id").eq("id", clusterId).eq("project_id", projectId).maybeSingle();
  return data ? null : "Cluster inexistent sau inaccesibil.";
}

function validUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return "URL-ul este obligatoriu.";
  if (!url.startsWith("/")) return "URL-ul trebuie să fie o cale internă (începe cu /).";
  if (url.length > 300) return "URL prea lung.";
  return null;
}

export interface MapResult {
  updated: number;
  skipped: number; // confirmed keywords left untouched (editorial protection)
}

/**
 * Map a whole cluster to a URL by writing mapped_url to its keywords. Keywords whose mapping
 * is already CONFIRMED are left untouched (editorial protection). cluster_id, primary_keyword
 * and other fields are never changed. `confirm` marks the written rows as confirmed.
 */
export async function mapClusterUrlAction(
  projectId: string,
  clusterId: string,
  url: string,
  confirm: boolean,
): Promise<MapResult | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const cErr = await assertCluster(db, projectId, clusterId);
  if (cErr) return { error: cErr };
  const uErr = validUrl(url);
  if (uErr) return { error: uErr };

  const target = url.trim();
  // How many confirmed rows exist (these are protected and will be skipped).
  const { count: confirmedCount } = await db
    .from("seo_keywords")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("cluster_id", clusterId)
    .eq("mapping_status", "confirmed");

  const { data, error } = await db
    .from("seo_keywords")
    .update({ mapped_url: target, mapping_status: confirm ? "confirmed" : "suggested" })
    .eq("project_id", projectId)
    .eq("cluster_id", clusterId)
    .neq("mapping_status", "confirmed") // never overwrite an editorial decision
    .select("id");
  if (error) return { error: error.message };

  const updated = (data as { id: string }[] | null)?.length ?? 0;
  await logActivity(db, {
    action: "seo_url_mapping.map_cluster",
    entityType: "seo_cluster",
    entityId: clusterId,
    metadata: { url: target, confirm, updated, skipped: confirmedCount ?? 0 },
  });
  return { updated, skipped: confirmedCount ?? 0 };
}

/** Clear a cluster's mapping on its non-confirmed keywords (confirmed ones are preserved). */
export async function removeClusterUrlAction(projectId: string, clusterId: string): Promise<MapResult | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const cErr = await assertCluster(db, projectId, clusterId);
  if (cErr) return { error: cErr };

  const { count: confirmedCount } = await db
    .from("seo_keywords")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("cluster_id", clusterId)
    .eq("mapping_status", "confirmed");

  const { data, error } = await db
    .from("seo_keywords")
    .update({ mapped_url: null, mapping_status: "none" })
    .eq("project_id", projectId)
    .eq("cluster_id", clusterId)
    .neq("mapping_status", "confirmed")
    .select("id");
  if (error) return { error: error.message };
  return { updated: (data as { id: string }[] | null)?.length ?? 0, skipped: confirmedCount ?? 0 };
}

/**
 * Set or clear a SINGLE keyword's mapping. This is an explicit manual edit, so it MAY change a
 * confirmed row (the admin is deciding directly). Passing url=null clears the mapping.
 */
export async function mapKeywordUrlAction(
  projectId: string,
  keywordId: string,
  url: string | null,
  confirm: boolean,
): Promise<{ ok: true } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  if (url !== null) {
    const uErr = validUrl(url);
    if (uErr) return { error: uErr };
  }
  const patch = url === null
    ? { mapped_url: null, mapping_status: "none" }
    : { mapped_url: url.trim(), mapping_status: confirm ? "confirmed" : "suggested" };
  const { error } = await db.from("seo_keywords").update(patch).eq("id", keywordId).eq("project_id", projectId);
  if (error) return { error: error.message };
  return { ok: true };
}
