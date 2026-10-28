"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { loadClusterKeywords } from "@/lib/db/admin-seo-clusters";
import {
  generateClusterSuggestions,
  type ClusterSuggestion,
  type CannibalWarning,
} from "@/lib/seo/clustering";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

/** Rejects operations against a project the admin can't see (belt-and-braces over RLS). */
async function assertProject(db: DB, projectId: string): Promise<string | null> {
  const { data } = await db.from("seo_projects").select("id").eq("id", projectId).maybeSingle();
  return data ? null : "Proiect inexistent sau inaccesibil.";
}

function validName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Numele clusterului este obligatoriu.";
  if (name.length > 120) return "Numele clusterului este prea lung (max 120).";
  return null;
}

// ── Suggestions (generate → preview) ────────────────────────────────────────────

export interface KeywordDisplay {
  keyword: string;
  volume: number | null;
  intent: string | null;
  parentTopic: string | null;
  mappingStatus: string;
}

export interface SuggestionsResult {
  suggestions: ClusterSuggestion[];
  warnings: CannibalWarning[];
  considered: number;
  truncated: number;
  ungrouped: number;
  suggestionsTotal: number;
  suggestionsTruncated: number;
  /** Display info for every keyword referenced by a suggestion or warning. */
  keywordMap: Record<string, KeywordDisplay>;
}

export async function generateSuggestionsAction(projectId: string): Promise<SuggestionsResult | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };

  const keywords = await loadClusterKeywords(projectId);
  const run = generateClusterSuggestions(keywords);

  const referenced = new Set<string>();
  for (const s of run.suggestions) s.keywordIds.forEach((id) => referenced.add(id));
  for (const w of run.warnings) w.refs.forEach((r) => referenced.add(r));
  const keywordMap: Record<string, KeywordDisplay> = {};
  for (const k of keywords)
    if (referenced.has(k.id))
      keywordMap[k.id] = { keyword: k.keyword, volume: k.volume, intent: k.intent, parentTopic: k.parentTopic, mappingStatus: k.mappingStatus };

  return { ...run, keywordMap };
}

// ── Apply selected suggestions (never automatic / never all) ──────────────────────

export interface ApplyGroup {
  name: string;
  intent: string | null;
  primaryKeyword: string | null;
  keywordIds: string[];
}

export interface ApplyResult {
  clustersCreated: number;
  keywordsAssigned: number;
  keywordsSkipped: number; // already assigned meanwhile (protected) or not in project
}

export async function applySuggestionsAction(projectId: string, groups: ApplyGroup[]): Promise<ApplyResult | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  if (!groups.length) return { error: "Nicio sugestie selectată." };

  let clustersCreated = 0;
  let keywordsAssigned = 0;
  let keywordsSkipped = 0;

  for (const g of groups) {
    const nErr = validName(g.name);
    if (nErr) return { error: nErr };
    const ids = [...new Set(g.keywordIds)].filter(Boolean);
    if (!ids.length) continue;

    const { data: created, error: cErr } = await db
      .from("seo_clusters")
      .insert({ project_id: projectId, name: g.name.trim(), intent: g.intent, primary_keyword: g.primaryKeyword })
      .select("id")
      .single();
    if (cErr || !created) return { error: `Eroare la crearea clusterului „${g.name}": ${cErr?.message ?? "necunoscută"}` };
    const clusterId = (created as { id: string }).id;
    clustersCreated++;

    // Assign ONLY keywords that are still unassigned — editorial protection enforced at the
    // DB level (is cluster_id null) so a concurrently-assigned keyword is never moved.
    const { data: assigned, error: aErr } = await db
      .from("seo_keywords")
      .update({ cluster_id: clusterId })
      .eq("project_id", projectId)
      .is("cluster_id", null)
      .in("id", ids)
      .select("id");
    if (aErr) return { error: `Eroare la atribuirea keywordurilor: ${aErr.message}` };
    const n = (assigned as { id: string }[] | null)?.length ?? 0;
    keywordsAssigned += n;
    keywordsSkipped += ids.length - n;
  }

  await logActivity(db, {
    action: "seo_cluster.apply_suggestions",
    entityType: "seo_project",
    entityId: projectId,
    metadata: { clustersCreated, keywordsAssigned, keywordsSkipped },
  });
  return { clustersCreated, keywordsAssigned, keywordsSkipped };
}

// ── Manual cluster management ─────────────────────────────────────────────────────

export async function createClusterAction(projectId: string, name: string, intent: string | null): Promise<{ id: string } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const nErr = validName(name);
  if (nErr) return { error: nErr };
  const { data, error } = await db
    .from("seo_clusters")
    .insert({ project_id: projectId, name: name.trim(), intent: intent?.trim() || null })
    .select("id")
    .single();
  if (error || !data) return { error: `Eroare la salvare: ${error?.message ?? "necunoscută"}` };
  const id = (data as { id: string }).id;
  await logActivity(db, { action: "seo_cluster.create", entityType: "seo_cluster", entityId: id, label: name.trim() });
  return { id };
}

export async function renameClusterAction(projectId: string, clusterId: string, name: string): Promise<{ ok: true } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const nErr = validName(name);
  if (nErr) return { error: nErr };
  const { error } = await db.from("seo_clusters").update({ name: name.trim() }).eq("id", clusterId).eq("project_id", projectId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function setClusterPrimaryAction(projectId: string, clusterId: string, primaryKeyword: string | null): Promise<{ ok: true } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const { error } = await db
    .from("seo_clusters")
    .update({ primary_keyword: primaryKeyword?.trim() || null })
    .eq("id", clusterId)
    .eq("project_id", projectId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Delete a cluster. Keywords are NOT deleted — the FK (on delete set null) detaches them. */
export async function deleteClusterAction(projectId: string, clusterId: string): Promise<{ ok: true } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const { error } = await db.from("seo_clusters").delete().eq("id", clusterId).eq("project_id", projectId);
  if (error) return { error: error.message };
  await logActivity(db, { action: "seo_cluster.delete", entityType: "seo_cluster", entityId: clusterId });
  return { ok: true };
}

/**
 * Assign/move keywords to a cluster (manual, explicit admin action — moving IS allowed here,
 * unlike the automatic engine). Passing clusterId=null removes them from their cluster.
 * Never touches mapped_url / mapping_status.
 */
export async function assignKeywordsAction(projectId: string, keywordIds: string[], clusterId: string | null): Promise<{ assigned: number } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const ids = [...new Set(keywordIds)].filter(Boolean);
  if (!ids.length) return { error: "Niciun keyword selectat." };

  if (clusterId) {
    // Validate the target cluster belongs to the project.
    const { data: c } = await db.from("seo_clusters").select("id").eq("id", clusterId).eq("project_id", projectId).maybeSingle();
    if (!c) return { error: "Cluster inexistent sau inaccesibil." };
  }
  const { data, error } = await db
    .from("seo_keywords")
    .update({ cluster_id: clusterId })
    .eq("project_id", projectId)
    .in("id", ids)
    .select("id");
  if (error) return { error: error.message };
  return { assigned: (data as { id: string }[] | null)?.length ?? 0 };
}
