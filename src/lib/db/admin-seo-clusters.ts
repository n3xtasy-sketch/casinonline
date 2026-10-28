import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { ClusterKeyword } from "@/lib/seo/clustering";

/**
 * Admin reads for keyword clustering (FAZA 5.1D). Admin session → RLS (is_admin())
 * gates everything; no service role here.
 */

export interface ClusterRow {
  id: string;
  name: string;
  intent: string | null;
  primaryKeyword: string | null;
  createdAt: string;
}

export async function listClusters(projectId: string): Promise<ClusterRow[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("seo_clusters")
    .select("id, name, intent, primary_keyword, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listClusters: ${error.message}`);
  return ((data as unknown as { id: string; name: string; intent: string | null; primary_keyword: string | null; created_at: string }[]) ?? []).map(
    (r) => ({ id: r.id, name: r.name, intent: r.intent, primaryKeyword: r.primary_keyword, createdAt: r.created_at }),
  );
}

/** All keywords of a project, mapped to the engine's shape (for suggestions + display). */
export async function loadClusterKeywords(projectId: string): Promise<ClusterKeyword[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("seo_keywords")
    .select("id, keyword, keyword_normalized, intent, volume, difficulty, parent_topic, cluster_id, mapped_url, mapping_status")
    .eq("project_id", projectId)
    .order("volume", { ascending: false, nullsFirst: false })
    .order("keyword_normalized", { ascending: true });
  if (error) throw new Error(`loadClusterKeywords: ${error.message}`);
  return ((data as unknown as {
    id: string; keyword: string; keyword_normalized: string; intent: string | null; volume: number | null;
    difficulty: number | null; parent_topic: string | null; cluster_id: string | null; mapped_url: string | null; mapping_status: string;
  }[]) ?? []).map((r) => ({
    id: r.id,
    keyword: r.keyword,
    normalized: r.keyword_normalized,
    intent: r.intent,
    volume: r.volume,
    difficulty: r.difficulty,
    parentTopic: r.parent_topic,
    clusterId: r.cluster_id,
    mappedUrl: r.mapped_url,
    mappingStatus: r.mapping_status,
  }));
}
