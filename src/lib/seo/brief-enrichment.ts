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
 * KE-2C.1 EDITORIAL RELEVANCE FILTERING: relation-derived recommendations (secondary topics, FAQ,
 * gaps) are scoped to the brief's page TYPE, derived from its target URL via the existing `pageScope`
 * taxonomy + the entity whose publicUrl equals the target. The entity LIST is always the entities
 * resolved from the keywords; only the relation EXPANSION is scoped — so an individual bonus page
 * does not inherit the whole operator's games/payment-methods/tags/FAQ.
 *   - offer   (/bonusuri-casino/<slug>): the concrete offer, its bonus type, the operator, and the
 *             offer's own page coverage — NOT the operator's games/payments/tags/FAQ.
 *   - review  (/cazinouri-online/<slug>): bonuses, bonus types, games, payment methods, license.
 *             Internal tags are metadata, never H2/H3 topics.
 *   - operator(/cazinouri-online/<op>/<intent>): bonus types/offers + license (intent-focused);
 *             not games/payments/tags.
 *   - general (/bonusuri/<slug>): category page — entity-level only; no single operator's relations.
 *   - other   (no/unknown target): all relations except internal tags (back-compat default).
 *
 * Recommendations are STATELESS (recomputed each load); there is no persisted "dismissed" state.
 */

import { normalizeKeyword } from "@/lib/seo-research";
import { pageScope } from "@/lib/seo/coverage";
import { resolveEntities, type EntityRecord } from "@/lib/seo/entity-registry";
import { relationsBySource, type EntityRelation, type RelationType } from "@/lib/seo/entity-relations";
import type { TopicalRow } from "@/lib/seo/topical-coverage";
import type { BriefEntity } from "@/lib/seo/brief";

export type RecommendationType = "entity" | "secondary_topic" | "faq_question" | "topical_gap";
export type RecProvenance = "confirmed_cms" | "verified_db" | "derived_cms" | "suggested";
export type RecConfidence = "high" | "medium" | "low";
export type BriefScope = "offer" | "review" | "operator" | "general" | "other";

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
  scope: BriefScope;
  entities: BriefRecommendation[];
  secondaryTopics: BriefRecommendation[];
  questions: BriefRecommendation[];
  gaps: BriefRecommendation[];
}

export interface BriefEnrichmentInput {
  keywords: string[]; // brief primary + secondary keywords (+ title)
  existingEntities: BriefEntity[];
  /** The brief's target URL — drives editorial relevance scoping (KE-2C.1). */
  targetUrl?: string | null;
}

const REL_NOUN: Record<RelationType, string> = {
  casino_bonus: "ofertă de bonus", casino_game: "joc", game_provider: "furnizor",
  casino_payment: "metodă de plată", casino_tag: "etichetă", bonus_bonus_type: "tip de bonus",
  casino_bonus_type: "tip de bonus", casino_license: "licență",
};
const PROV_OF: Record<EntityRelation["provenance"], RecProvenance> = {
  verified_db: "verified_db", derived_cms: "derived_cms", inferred_rule: "suggested",
};

// Which relation types feed secondary topics / FAQ per scope. Internal tags (casino_tag) are
// metadata and NEVER a topic. `null` = no relation expansion for that scope.
const TOPIC_RELS: Record<BriefScope, ReadonlySet<RelationType> | null> = {
  offer: new Set<RelationType>(["bonus_bonus_type", "casino_bonus"]), // handled specially (offer + operator)
  review: new Set<RelationType>(["casino_bonus", "casino_bonus_type", "casino_game", "casino_payment", "casino_license"]),
  operator: new Set<RelationType>(["casino_bonus", "casino_bonus_type", "casino_license"]),
  general: null,
  other: new Set<RelationType>(["casino_bonus", "casino_bonus_type", "casino_game", "casino_payment", "casino_license", "game_provider", "bonus_bonus_type"]),
};
const FAQ_RELS: Record<BriefScope, ReadonlySet<RelationType> | null> = {
  offer: null, general: null,
  review: new Set<RelationType>(["casino_payment", "casino_bonus_type", "casino_game", "casino_license"]),
  operator: new Set<RelationType>(["casino_bonus_type", "casino_license"]),
  other: new Set<RelationType>(["casino_payment", "casino_bonus_type", "casino_game", "casino_license"]),
};

const FAQ_TEXT: Partial<Record<RelationType, (n: string) => string>> = {
  casino_payment: (n) => `Ce metode de plată acceptă ${n}?`,
  casino_bonus_type: (n) => `Ce tipuri de bonusuri oferă ${n}?`,
  casino_game: (n) => `Ce jocuri sunt disponibile la ${n}?`,
  casino_license: (n) => `Ce licență deține ${n}?`,
};

function rank(c: RecConfidence): number { return c === "high" ? 3 : c === "medium" ? 2 : 1; }

/** Determine the brief's editorial scope + primary entity from its target URL. */
function resolveScope(targetUrl: string | null | undefined, byPublicUrl: Map<string, EntityRecord>): { scope: BriefScope; primary: EntityRecord | null } {
  const t = (targetUrl ?? "").trim().replace(/\/+$/, "");
  if (!t) return { scope: "other", primary: null };
  const primary = byPublicUrl.get(t) ?? null;
  if (primary?.type === "bonus") return { scope: "offer", primary };
  if (primary?.type === "casino") return { scope: "review", primary };
  const ps = pageScope(t);
  if (ps === "operator") {
    const opBase = "/" + t.split("/").filter(Boolean).slice(0, 2).join("/"); // /cazinouri-online/<op>
    return { scope: "operator", primary: byPublicUrl.get(opBase) ?? null };
  }
  if (ps === "offer") return { scope: "offer", primary: null }; // offer slug not (yet) in registry
  if (ps === "general") return { scope: "general", primary: null };
  return { scope: "other", primary: null };
}

/** Select the relations in editorial scope for this brief (drives secondary topics + gaps). */
function scopedRelations(
  scope: BriefScope, primary: EntityRecord | null, relevantIds: Set<string>,
  relations: EntityRelation[], bySource: Map<string, EntityRelation[]>,
): EntityRelation[] {
  const allow = TOPIC_RELS[scope];
  if (allow === null) return []; // general → entity-level only
  if (scope === "offer") {
    if (!primary) return [];
    const ownType = (bySource.get(primary.id) ?? []).filter((r) => r.relationType === "bonus_bonus_type");
    const operatorLink = relations.filter((r) => r.relationType === "casino_bonus" && r.targetEntityId === primary.id);
    return [...ownType, ...operatorLink];
  }
  if (scope === "review" || scope === "operator") {
    return primary ? (bySource.get(primary.id) ?? []).filter((r) => allow.has(r.relationType)) : [];
  }
  // other: expand every keyword-resolved entity, minus internal tags.
  return [...relevantIds].sort().flatMap((id) => bySource.get(id) ?? []).filter((r) => allow.has(r.relationType));
}

/** Build read-only semantic recommendations for a brief, scoped to its page type (KE-2C.1). */
export function enrichBrief(
  input: BriefEnrichmentInput,
  registry: EntityRecord[],
  relations: EntityRelation[],
  topical: TopicalRow[],
): BriefEnrichment {
  const byId = new Map(registry.map((e) => [e.id, e] as const));
  const byPublicUrl = new Map(registry.filter((e) => e.publicUrl).map((e) => [e.publicUrl as string, e] as const));
  const bySource = relationsBySource(relations);
  const { scope, primary } = resolveScope(input.targetUrl, byPublicUrl);

  const existingRefs = new Set(input.existingEntities.map((e) => e.ref).filter(Boolean) as string[]);
  const existingNames = new Set(input.existingEntities.map((e) => normalizeKeyword(e.name)));
  const isInBrief = (e: EntityRecord) =>
    (e.publicUrl != null && existingRefs.has(e.publicUrl)) || existingNames.has(normalizeKeyword(e.name));

  // ── 1) Relevant entities from the keywords (unchanged — the entity LIST is never over-filtered). ──
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
    id: `ent:${r.entity.id}`, type: "entity", label: `${r.entity.name} (${r.entity.type})`,
    provenance: "confirmed_cms", confidence: r.confidence, reasons: r.reasons, entityId: r.entity.id,
    alreadyInBrief: isInBrief(r.entity),
  }));

  // ── 2) Secondary topics — ONLY from relations in editorial scope (KE-2C.1). ──
  const scoped = scopedRelations(scope, primary, relevantIds, relations, bySource)
    .slice()
    .sort((a, b) => a.relationType.localeCompare(b.relationType) || a.targetEntityId.localeCompare(b.targetEntityId));
  const secSeen = new Set<string>();
  const secondaryTopics: BriefRecommendation[] = [];
  for (const rel of scoped) {
    const isOperatorLink = scope === "offer" && rel.relationType === "casino_bonus"; // surface the operator, not the offer
    const relatedId = isOperatorLink ? rel.sourceEntityId : rel.targetEntityId;
    const key = `${rel.relationType}:${relatedId}`;
    if (secSeen.has(key)) continue;
    secSeen.add(key);
    const related = byId.get(relatedId) ?? null;
    const isLicense = rel.relationType === "casino_license";
    const label = isLicense
      ? `Licență ${rel.targetEntityId.replace("license:", "").toUpperCase()}`
      : isOperatorLink
        ? `Operator: ${related?.name ?? relatedId}`
        : `${related?.name ?? relatedId} — ${REL_NOUN[rel.relationType]}`;
    secondaryTopics.push({
      id: `top:${scope}:${key}`, type: "secondary_topic", label,
      provenance: PROV_OF[rel.provenance], confidence: rel.provenance === "verified_db" ? "high" : "medium",
      reasons: rel.reasons, relationType: rel.relationType, targetEntityId: rel.targetEntityId,
      entityId: primary?.id ?? rel.sourceEntityId,
      alreadyInBrief: related ? isInBrief(related) : false,
    });
  }

  // ── 3) FAQ questions — scoped; only where a verified relation class exists (answers are editorial). ──
  const faqAllow = FAQ_RELS[scope];
  const faqSources = scope === "other"
    ? [...relevantIds].filter((id) => byId.get(id)?.type === "casino").sort()
    : primary && primary.type === "casino" ? [primary.id] : [];
  const questions: BriefRecommendation[] = [];
  if (faqAllow) {
    for (const id of faqSources) {
      const src = byId.get(id);
      if (!src) continue;
      const relTypes = new Set((bySource.get(id) ?? []).map((r) => r.relationType));
      for (const rel of ["casino_payment", "casino_bonus_type", "casino_game", "casino_license"] as RelationType[]) {
        if (!faqAllow.has(rel) || !relTypes.has(rel)) continue;
        questions.push({
          id: `faq:${id}:${rel}`, type: "faq_question", label: FAQ_TEXT[rel]!(src.name),
          provenance: "verified_db", confidence: "medium",
          reasons: [`Întrebare fundamentată pe relația verificată „${rel}" (răspunsul se completează editorial, nu e inventat).`],
          entityId: id, relationType: rel,
        });
      }
    }
  }

  // ── 4) Topical gaps — only for relations in editorial scope, not covered. ──
  const scopedKeys = new Set(scoped.map((r) => `${r.sourceEntityId}|${r.relationType}|${r.targetEntityId}`));
  const gaps: BriefRecommendation[] = topical
    .filter((t) => t.state !== "covered" && scopedKeys.has(`${t.sourceEntityId}|${t.relation.relationType}|${t.targetEntityId}`))
    .map((t) => {
      const src = byId.get(t.sourceEntityId);
      const tgt = byId.get(t.targetEntityId);
      const subject = t.relation.relationType === "casino_license"
        ? `licență ${t.targetEntityId.replace("license:", "").toUpperCase()}`
        : tgt?.name ?? t.targetEntityId;
      return {
        id: `gap:${t.sourceEntityId}:${t.relation.relationType}:${t.targetEntityId}`, type: "topical_gap" as const,
        label: `${src?.name ?? t.sourceEntityId} → ${subject} [${t.state}]`,
        provenance: PROV_OF[t.relation.provenance],
        confidence: (t.state === "candidate" || t.state === "planned" ? "medium" : "low") as RecConfidence,
        reasons: t.reasons, relationType: t.relation.relationType, targetEntityId: t.targetEntityId,
        entityId: t.sourceEntityId, editorialAction: t.editorialAction,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return { scope, entities, secondaryTopics, questions, gaps };
}
