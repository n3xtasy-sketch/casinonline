/**
 * KE-2D Entity & Topical Dashboard — PURE, DETERMINISTIC, no I/O, no AI/SERP/GSC.
 *
 * Projects the GLOBAL CMS entity graph (KE-2A/2B) down to the entities RELEVANT to one project,
 * derived ONLY from that project's own keywords/clusters (resolveEntities). It never attributes
 * unrelated CMS entities/relations to a project, never turns CMS presence into editorial coverage,
 * and never fabricates SEO metrics. Rows carry the entity, its verified/derived relations and its
 * topical-coverage rows (from KE-2B) so the UI can render KPIs, a table, filters and valid links.
 */

import { resolveEntities, type EntityRecord, type EntityType, type MatchConfidence } from "@/lib/seo/entity-registry";
import { relationsBySource, type EntityRelation } from "@/lib/seo/entity-relations";
import type { TopicalRow, TopicalState } from "@/lib/seo/topical-coverage";

export const TOPICAL_STATES: readonly TopicalState[] = ["covered", "candidate", "planned", "identified", "gap", "ambiguous"] as const;

export interface EntityDashboardRow {
  entityId: string;
  type: EntityType;
  name: string;
  slug: string;
  status: string;
  publicUrl: string | null;
  confidence: MatchConfidence; // best entity-resolution confidence across the project's keywords
  matchedFrom: string[]; // sample of project keywords that resolved this entity
  relations: EntityRelation[]; // relations whose SOURCE is this entity
  topical: TopicalRow[]; // topical rows whose SOURCE is this entity
  verifiedCount: number;
  derivedCount: number;
  topicalCounts: Record<TopicalState, number>;
}

export interface EntityKpis {
  entities: number;
  relationsVerified: number;
  relationsDerived: number;
  topical: Record<TopicalState, number>;
}

export interface EntityDashboard {
  rows: EntityDashboardRow[];
  kpis: EntityKpis;
}

export interface EntityDashboardFilters {
  type?: string; // EntityType
  topical?: string; // TopicalState — keep entities that have ≥1 topical row in this state
  provenance?: string; // verified_db | derived_cms — keep entities with ≥1 relation of this provenance
  confidence?: string; // high | medium | low
}

const confRank = (c: MatchConfidence): number => (c === "high" ? 3 : c === "medium" ? 2 : 1);
const zeroTopical = (): Record<TopicalState, number> =>
  ({ covered: 0, candidate: 0, planned: 0, identified: 0, gap: 0, ambiguous: 0 });

/**
 * Build the project-scoped dashboard. `projectKeywords` must come from the project's own data; the
 * global `registry`/`relations`/`topical` are filtered to whatever those keywords resolve to.
 * Deterministic: rows sorted by confidence desc, then type, name, id.
 */
export function buildEntityDashboard(
  projectKeywords: string[],
  registry: EntityRecord[],
  relations: EntityRelation[],
  topical: TopicalRow[],
): EntityDashboard {
  const byId = new Map(registry.map((e) => [e.id, e] as const));
  const bySource = relationsBySource(relations);
  const topicalBySource = new Map<string, TopicalRow[]>();
  for (const t of topical) {
    const list = topicalBySource.get(t.sourceEntityId) ?? [];
    list.push(t);
    topicalBySource.set(t.sourceEntityId, list);
  }

  // Resolve project-relevant entities (high/medium only — no low-overlap noise). Alias collisions
  // keep BOTH competing entities (each resolves), surfacing ambiguity rather than guessing.
  const best = new Map<string, { confidence: MatchConfidence; matchedFrom: string[] }>();
  for (const kw of projectKeywords) {
    for (const m of resolveEntities(kw, registry)) {
      if (m.confidence === "low") continue;
      const cur = best.get(m.entity.id);
      if (!cur) {
        best.set(m.entity.id, { confidence: m.confidence, matchedFrom: [kw] });
      } else {
        if (confRank(m.confidence) > confRank(cur.confidence)) cur.confidence = m.confidence;
        if (cur.matchedFrom.length < 5 && !cur.matchedFrom.includes(kw)) cur.matchedFrom.push(kw);
      }
    }
  }

  const rows: EntityDashboardRow[] = [];
  for (const [id, info] of best) {
    const entity = byId.get(id);
    if (!entity) continue; // resolveEntities only returns registry entities, but stay defensive
    const rels = (bySource.get(id) ?? []).slice().sort(
      (a, b) => a.relationType.localeCompare(b.relationType) || a.targetEntityId.localeCompare(b.targetEntityId),
    );
    const tops = (topicalBySource.get(id) ?? []).slice().sort(
      (a, b) => a.relation.relationType.localeCompare(b.relation.relationType) || a.targetEntityId.localeCompare(b.targetEntityId),
    );
    const topicalCounts = zeroTopical();
    for (const t of tops) topicalCounts[t.state] += 1;
    rows.push({
      entityId: id,
      type: entity.type,
      name: entity.name,
      slug: entity.slug,
      status: entity.status,
      publicUrl: entity.publicUrl,
      confidence: info.confidence,
      matchedFrom: info.matchedFrom,
      relations: rels,
      topical: tops,
      verifiedCount: rels.filter((r) => r.provenance === "verified_db").length,
      derivedCount: rels.filter((r) => r.provenance === "derived_cms").length,
      topicalCounts,
    });
  }

  rows.sort(
    (a, b) =>
      confRank(b.confidence) - confRank(a.confidence) ||
      a.type.localeCompare(b.type) ||
      a.name.localeCompare(b.name) ||
      a.entityId.localeCompare(b.entityId),
  );

  // KPIs over the full (unfiltered) relevant set. Each relation has exactly one source entity in
  // the set, so per-row sums never double-count.
  const topicalKpi = zeroTopical();
  let relationsVerified = 0;
  let relationsDerived = 0;
  for (const r of rows) {
    relationsVerified += r.verifiedCount;
    relationsDerived += r.derivedCount;
    for (const s of TOPICAL_STATES) topicalKpi[s] += r.topicalCounts[s];
  }

  return { rows, kpis: { entities: rows.length, relationsVerified, relationsDerived, topical: topicalKpi } };
}

/** Apply dashboard filters, preserving the deterministic order. */
export function filterEntityRows(rows: EntityDashboardRow[], f: EntityDashboardFilters): EntityDashboardRow[] {
  return rows.filter((r) => {
    if (f.type && r.type !== f.type) return false;
    if (f.confidence && r.confidence !== f.confidence) return false;
    if (f.provenance && !r.relations.some((rel) => rel.provenance === f.provenance)) return false;
    if (f.topical && !r.topical.some((t) => t.state === f.topical)) return false;
    return true;
  });
}

/** Distinct entity types present (for the filter facet), in a stable order. */
export function entityTypeFacets(rows: EntityDashboardRow[]): EntityType[] {
  return [...new Set(rows.map((r) => r.type))].sort();
}
