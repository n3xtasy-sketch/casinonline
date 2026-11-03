/**
 * KE-1C dashboard aggregation — PURE, DETERMINISTIC, no I/O. Joins KE-1A coverage with KE-1B
 * opportunity scoring per cluster, computes KPIs, and filters/sorts rows. The route loads data
 * once (no N+1) and calls these; nothing here duplicates the coverage/scoring algorithms.
 */

import { computeCoverage, type CoverageRow, type CoverageState, type CoverageConfidence } from "@/lib/seo/coverage";
import { scoreOpportunity, type OpportunityScore, type OpportunityKeyword } from "@/lib/seo/opportunity";
import type { ClusterForMapping } from "@/lib/seo/url-mapping";
import type { UrlEntry } from "@/lib/db/url-inventory";

export type DashboardKeyword = OpportunityKeyword;

export interface DashboardRow {
  clusterId: string;
  clusterName: string;
  primaryKeyword: string | null;
  intent: string | null; // cluster intent (display + filter)
  keywordCount: number;
  coverage: CoverageRow;
  opportunity: OpportunityScore;
  /** True when the cluster has no keywords / not enough signals — NEVER auto-ranked in the top
   *  even though scoreOpportunity may return 100 from renormalization. */
  insufficientData: boolean;
}

export function buildDashboardRows(
  clusters: ClusterForMapping[],
  metricsByCluster: Map<string, DashboardKeyword[]>,
  inventory: UrlEntry[],
): DashboardRow[] {
  const coverageById = new Map(computeCoverage(clusters, inventory).map((r) => [r.clusterId, r]));
  return clusters.map((c): DashboardRow => {
    const coverage = coverageById.get(c.id)!;
    const keywords = metricsByCluster.get(c.id) ?? [];
    const opportunity = scoreOpportunity({ coverageState: coverage.state, coverageConfidence: coverage.confidence, keywords });
    // Insufficient = no keywords, OR every optional factor (demand/feasibility/intent) is missing
    // so only the content-gap drove the (renormalized) score.
    const insufficientData = keywords.length === 0 || opportunity.missingFactors.length >= 3;
    return {
      clusterId: c.id,
      clusterName: c.name,
      primaryKeyword: c.primaryKeyword,
      intent: c.intent,
      keywordCount: keywords.length,
      coverage,
      opportunity,
      insufficientData,
    };
  });
}

export interface CoverageKpis {
  total: number;
  covered: number;
  candidate: number;
  planned: number;
  gap: number;
  ambiguous: number;
  insufficientData: number;
}

export function aggregateKpis(rows: DashboardRow[]): CoverageKpis {
  const k: CoverageKpis = { total: rows.length, covered: 0, candidate: 0, planned: 0, gap: 0, ambiguous: 0, insufficientData: 0 };
  for (const r of rows) {
    k[r.coverage.state] += 1;
    if (r.insufficientData) k.insufficientData += 1;
  }
  return k;
}

export interface DashboardFilters {
  state?: string; // CoverageState
  confidence?: string; // CoverageConfidence
  intent?: string; // exact cluster intent
  dir?: "asc" | "desc"; // by opportunity score; default desc
}

/**
 * Filter + sort. Sort key: insufficient-data rows ALWAYS after sufficient ones (so they never top
 * the list even at score 100), then by opportunity score (desc by default), tie-broken by clusterId
 * for determinism.
 */
export function filterAndSortRows(rows: DashboardRow[], f: DashboardFilters = {}): DashboardRow[] {
  const validState = (["covered", "candidate", "planned", "gap", "ambiguous"] as CoverageState[]).includes(f.state as CoverageState);
  const validConf = (["high", "medium", "low"] as CoverageConfidence[]).includes(f.confidence as CoverageConfidence);
  let out = rows;
  if (validState) out = out.filter((r) => r.coverage.state === f.state);
  if (validConf) out = out.filter((r) => r.opportunity.confidence === f.confidence);
  if (f.intent) out = out.filter((r) => r.intent === f.intent);
  return [...out].sort((a, b) => {
    if (a.insufficientData !== b.insufficientData) return a.insufficientData ? 1 : -1; // sufficient first, always
    const sa = a.opportunity.score;
    const sb = b.opportunity.score;
    const byScore = f.dir === "asc" ? sa - sb : sb - sa; // default desc (highest opportunity first)
    return byScore || a.clusterId.localeCompare(b.clusterId); // deterministic tie-break
  });
}

/** Distinct non-null cluster intents present (for the filter dropdown). */
export function intentFacets(rows: DashboardRow[]): string[] {
  return [...new Set(rows.map((r) => r.intent).filter((x): x is string => !!x))].sort();
}
