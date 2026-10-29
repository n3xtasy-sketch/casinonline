import "server-only";
import { listClusters, loadClusterKeywords } from "@/lib/db/admin-seo-clusters";
import type { ClusterForMapping } from "@/lib/seo/url-mapping";

/** Clusters + their keywords in the shape the URL-mapping engine expects (admin RLS). */
export async function loadClustersForMapping(projectId: string): Promise<ClusterForMapping[]> {
  const [clusters, keywords] = await Promise.all([listClusters(projectId), loadClusterKeywords(projectId)]);
  return clusters.map((c) => ({
    id: c.id,
    name: c.name,
    intent: c.intent,
    primaryKeyword: c.primaryKeyword,
    keywords: keywords
      .filter((k) => k.clusterId === c.id)
      .map((k) => ({ id: k.id, keyword: k.keyword, normalized: k.normalized, mappedUrl: k.mappedUrl, mappingStatus: k.mappingStatus })),
  }));
}
