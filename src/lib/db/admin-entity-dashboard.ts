import "server-only";
import { listClusters, loadClusterKeywords } from "@/lib/db/admin-seo-clusters";
import { loadSemanticContext, type SemanticContext } from "@/lib/db/admin-relations";

/**
 * Loads everything the KE-2D entity dashboard needs for a project in a FIXED number of queries
 * (semantic context + clusters + keywords) — no per-entity/per-cluster query (no N+1). The entity
 * graph is GLOBAL CMS, but `projectKeywords` is derived ONLY from this project's clusters/keywords
 * (RLS + project-scoped reads), so the dashboard resolves only project-relevant entities. Read-only.
 */
export interface EntityDashboardData extends SemanticContext {
  projectKeywords: string[];
}

export async function loadEntityDashboardData(projectId: string): Promise<EntityDashboardData> {
  const [ctx, clusters, keywords] = await Promise.all([
    loadSemanticContext(),
    listClusters(projectId),
    loadClusterKeywords(projectId),
  ]);

  const seen = new Set<string>();
  const projectKeywords: string[] = [];
  const add = (s: string | null | undefined) => {
    const v = (s ?? "").trim();
    if (!v || seen.has(v.toLowerCase())) return;
    seen.add(v.toLowerCase());
    projectKeywords.push(v);
  };
  for (const c of clusters) { add(c.name); add(c.primaryKeyword); }
  for (const k of keywords) add(k.keyword);

  return { ...ctx, projectKeywords };
}
