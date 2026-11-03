/**
 * KE-2C Semantic Brief Enrichment — PURE, DETERMINISTIC, no I/O, no AI/SERP/GSC.
 *
 * Turns a brief's keywords into READ-ONLY recommendations by reusing the KE-2A registry (entity
 * resolution), KE-2B relations (verified_db / derived_cms) and KE-2B topical coverage. It NEVER
 * mutates a brief and NEVER fabricates bonus terms, wagering, payment methods, licenses or offers —
 * every recommendation is grounded in a resolved CMS entity, a real relation, or a topical-coverage
 * row. A verified DB relation is never presented as proof of editorial coverage, and nothing is
 * claimed to be SERP/AI-validated.
 *
 * Recommendations are STATELESS: recomputed on every load. There is no persisted "dismissed" state
 * (no schema support in this phase — see report), so dismissals are not remembered; the engine only
 * marks whether a recommendation is already present in the brief (`alreadyInBrief`) so the UI can
 * avoid proposing duplicates.
 */

import { normalizeKeyword } from "@/lib/seo-research";
import { resolveEntities, type EntityRecord } from "@/lib/seo/entity-registry";
import { relationsBySource, type EntityRelation, type RelationType } from "@/lib/seo/entity-relations";
import type { TopicalRow } from "@/lib/seo/topical-coverage";
import type { BriefEntity } from "@/lib/seo/brief";

export type RecommendationType = "entity" | "secondary_topic" | "faq_question" | "topical_gap";
export type RecProvenance = "confirmed_cms" | "verified_db" | "derived_cms" | "suggested";
export type RecConfidence = "high" | "medium" | "low";

export interface BriefRecommendation {
  id: string; // stable, dedupe key
  type: RecommendationType;
  label: string;
  provenance: RecProvenance;
  confidence: RecConfidence;
  reasons: string[];
  entityId?: string;
  relationType?: RelationType;
  targetEntityId?: string;
  editorialAction?: string;
  /** True when this entity is already in the brief — surfaced so the UI never proposes a duplicate. */
  alreadyInBrief?: boolean;
}

export interface BriefEnrichment {
  entities: BriefRecommendation[];
  secondaryTopics: BriefRecommendation[];
  questions: BriefRecommendation[];
  gaps: BriefRecommendation[];
}

export interface BriefEnrichmentInput {
  keywords: string[]; // brief primary + secondary keywords (+ title)
  existingEntities: BriefEntity[];
}

const REL_NOUN: Record<RelationType, string> = {
  casino_bonus: "ofertă de bonus", casino_game: "joc", game_provider: "furnizor",
  casino_payment: "metodă de plată", casino_tag: "etichetă", bonus_bonus_type: "tip de bonus",
  casino_bonus_type: "tip de bonus", casino_license: "licență",
};
const PROV_OF: Record<EntityRelation["provenance"], RecProvenance> = {
  verified_db: "verified_db", derived_cms: "derived_cms", inferred_rule: "suggested",
};

/** Build read-only semantic recommendations for a brief. Deterministic. */
export function enrichBrief(
  input: BriefEnrichmentInput,
  registry: EntityRecord[],
  relations: EntityRelation[],
  topical: TopicalRow[],
): BriefEnrichment {
  const byId = new Map(registry.map((e) => [e.id, e] as const));
  const bySource = relationsBySource(relations);

  // Existing-entity keys (ref + normalized name) for alreadyInBrief / de-duplication.
  const existingRefs = new Set(input.existingEntities.map((e) => e.ref).filter(Boolean) as string[]);
  const existingNames = new Set(input.existingEntities.map((e) => normalizeKeyword(e.name)));
  const isInBrief = (e: EntityRecord) =>
    (e.publicUrl != null && existingRefs.has(e.publicUrl)) || existingNames.has(normalizeKeyword(e.name));

  // ── 1) Resolve relevant entities from the keywords (high/medium only — no low-overlap noise). ──
  const best = new Map<string, { entity: EntityRecord; confidence: RecConfidence; reasons: string[] }>();
  for (const kw of input.keywords) {
    for (const m of resolveEntities(kw, registry)) {
      if (m.confidence === "low") continue;
      const prev = best.get(m.entity.id);
      if (!prev || rank(m.confidence) > rank(prev.confidence)) {
        best.set(m.entity.id, { entity: m.entity, confidence: m.confidence, reasons: [`Rezolvat din „${kw}" (${m.matchType}).`] });
      }
    }
  }
  const relevant = [...best.values()].sort((a, b) => a.entity.id.localeCompare(b.entity.id));
  const relevantIds = new Set(relevant.map((r) => r.entity.id));

  const entities: BriefRecommendation[] = relevant.map((r) => ({
    id: `ent:${r.entity.id}`,
    type: "entity",
    label: `${r.entity.name} (${r.entity.type})`,
    provenance: "confirmed_cms",
    confidence: r.confidence,
    reasons: r.reasons,
    entityId: r.entity.id,
    alreadyInBrief: isInBrief(r.entity),
  }));

  // ── 2) Secondary topics from relations whose SOURCE is a relevant entity. ──
  const secSeen = new Set<string>();
  const secondaryTopics: BriefRecommendation[] = [];
  for (const id of [...relevantIds].sort()) {
    for (const rel of (bySource.get(id) ?? []).slice().sort(cmpRelation)) {
      const key = `${rel.relationType}:${rel.targetEntityId}`;
      if (secSeen.has(key)) continue;
      secSeen.add(key);
      const target = byId.get(rel.targetEntityId) ?? null;
      const isLicense = rel.relationType === "casino_license";
      const label = isLicense
        ? `Licență ${rel.targetEntityId.replace("license:", "").toUpperCase()}`
        : `${target?.name ?? rel.targetEntityId} — ${REL_NOUN[rel.relationType]}`;
      secondaryTopics.push({
        id: `top:${id}:${key}`,
        type: "secondary_topic",
        label,
        provenance: PROV_OF[rel.provenance],
        confidence: rel.provenance === "verified_db" ? "high" : "medium",
        reasons: rel.reasons,
        relationType: rel.relationType,
        targetEntityId: rel.targetEntityId,
        entityId: id,
        alreadyInBrief: target ? isInBrief(target) : false,
      });
    }
  }

  // ── 3) FAQ questions — deterministic, ONLY where a verified relation class exists. ──
  const questions: BriefRecommendation[] = [];
  const QUESTION_RULES: { rel: RelationType; q: (name: string) => string }[] = [
    { rel: "casino_payment", q: (n) => `Ce metode de plată acceptă ${n}?` },
    { rel: "casino_bonus_type", q: (n) => `Ce tipuri de bonusuri oferă ${n}?` },
    { rel: "casino_game", q: (n) => `Ce jocuri sunt disponibile la ${n}?` },
    { rel: "casino_license", q: (n) => `Ce licență deține ${n}?` },
  ];
  for (const id of [...relevantIds].sort()) {
    const src = byId.get(id);
    if (!src || src.type !== "casino") continue;
    const relTypes = new Set((bySource.get(id) ?? []).map((r) => r.relationType));
    for (const rule of QUESTION_RULES) {
      if (!relTypes.has(rule.rel)) continue; // data permits only if the relation exists
      questions.push({
        id: `faq:${id}:${rule.rel}`,
        type: "faq_question",
        label: rule.q(src.name),
        provenance: "verified_db",
        confidence: "medium",
        reasons: [`Întrebare fundamentată pe relația verificată „${rule.rel}" (răspunsul se completează editorial, nu e inventat).`],
        entityId: id,
        relationType: rule.rel,
      });
    }
  }

  // ── 4) Topical gaps — topical rows whose source is relevant and NOT covered. ──
  const gaps: BriefRecommendation[] = topical
    .filter((t) => relevantIds.has(t.sourceEntityId) && t.state !== "covered")
    .map((t) => {
      const src = byId.get(t.sourceEntityId);
      const tgt = byId.get(t.targetEntityId);
      const subject = t.relation.relationType === "casino_license"
        ? `licență ${t.targetEntityId.replace("license:", "").toUpperCase()}`
        : tgt?.name ?? t.targetEntityId;
      return {
        id: `gap:${t.sourceEntityId}:${t.relation.relationType}:${t.targetEntityId}`,
        type: "topical_gap" as const,
        label: `${src?.name ?? t.sourceEntityId} → ${subject} [${t.state}]`,
        provenance: PROV_OF[t.relation.provenance],
        confidence: (t.state === "candidate" || t.state === "planned" ? "medium" : "low") as RecConfidence,
        reasons: t.reasons,
        relationType: t.relation.relationType,
        targetEntityId: t.targetEntityId,
        entityId: t.sourceEntityId,
        editorialAction: t.editorialAction,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return { entities, secondaryTopics, questions, gaps };
}

function rank(c: RecConfidence): number {
  return c === "high" ? 3 : c === "medium" ? 2 : 1;
}
function cmpRelation(a: EntityRelation, b: EntityRelation): number {
  return a.relationType.localeCompare(b.relationType) || a.targetEntityId.localeCompare(b.targetEntityId);
}
