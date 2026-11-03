import "server-only";
import { listClusters, loadClusterKeywords } from "@/lib/db/admin-seo-clusters";
import { buildUrlInventory, type UrlEntry } from "@/lib/db/url-inventory";
import type { ClusterForMapping } from "@/lib/seo/url-mapping";
import type { DashboardKeyword } from "@/lib/seo/coverage-dashboard";

/**
 * Loads everything the KE-1C coverage dashboard needs for a project in a FIXED number of queries
 * (clusters + keywords + inventory) — no per-cluster query (no N+1). Admin session → RLS is_admin()
 * + project-scoped reads give project isolation. Computation is done by the pure engines on top.
 */
export interface CoverageData {
  clusters: ClusterForMapping[];
  metricsByCluster: Map<string, DashboardKeyword[]>;
  inventory: UrlEntry[];
}

export async function loadCoverageData(projectId: string): Promise<CoverageData> {
  const [clusterRows, keywords, inventory] = await Promise.all([
    listClusters(projectId),
    loadClusterKeywords(projectId), // ClusterKeyword[] with volume/difficulty/intent — single query
    buildUrlInventory({ includeDrafts: true }), // drafts surfaced as `planned`
  ]);

  // Group keywords by cluster once; build both the mapping shape (for coverage) and the metrics
  // shape (for opportunity scoring) in a single pass.
  const mappingByCluster = new Map<string, ClusterForMapping["keywords"]>();
  const metricsByCluster = new Map<string, DashboardKeyword[]>();
  for (const k of keywords) {
    if (!k.clusterId) continue;
    (mappingByCluster.get(k.clusterId) ?? mappingByCluster.set(k.clusterId, []).get(k.clusterId)!).push({
      id: k.id, keyword: k.keyword, normalized: k.normalized, mappedUrl: k.mappedUrl, mappingStatus: k.mappingStatus,
    });
    (metricsByCluster.get(k.clusterId) ?? metricsByCluster.set(k.clusterId, []).get(k.clusterId)!).push({
      keyword: k.keyword, volume: k.volume, difficulty: k.difficulty, intent: k.intent,
    });
  }

  const clusters: ClusterForMapping[] = clusterRows.map((c) => ({
    id: c.id, name: c.name, intent: c.intent, primaryKeyword: c.primaryKeyword,
    keywords: mappingByCluster.get(c.id) ?? [],
  }));

  return { clusters, metricsByCluster, inventory };
}
