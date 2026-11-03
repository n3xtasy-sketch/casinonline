/**
 * KE-2B Entity Relationship Engine — PURE, DETERMINISTIC, no I/O, no AI/SERP/GSC.
 *
 * Builds relations between registry entities (KE-2A) ONLY from real CMS data. Each relation carries
 * an explicit provenance that must NEVER be inflated:
 *   - verified_db   : a real DB foreign key or junction row (casino→bonus, casino→game, …).
 *   - derived_cms   : factual, but derived by joining/reading CMS columns rather than a single FK
 *                     (casino→bonus_type via the bonuses join; casino→license from the column value).
 *   - inferred_rule : produced by an application rule/heuristic (NOT used in KE-2B — reserved; an
 *                     inferred relation must never be labelled verified_db).
 *
 * Entity ids match KE-2A: `<type>:<cmsId>`. The license target is a pseudo-id `license:<value>`
 * (there is no license entity in the registry) — flagged derived_cms, never verified_db.
 */

import { normalizeKeyword } from "@/lib/seo-research";

export type RelationType =
  | "casino_bonus" // casino → bonus (bonuses.casino_id)
  | "casino_game" // casino → game (casino_games junction)
  | "game_provider" // game → provider (games.provider_id)
  | "casino_payment" // casino → payment (casino_payment_methods junction)
  | "casino_tag" // casino → tag (casino_tags junction)
  | "bonus_bonus_type" // bonus → bonus_type (bonuses.bonus_type_id)
  | "casino_bonus_type" // casino → bonus_type (derived: join over bonuses)
  | "casino_license"; // casino → license value (casinos.license column)

export type RelationProvenance = "verified_db" | "derived_cms" | "inferred_rule";
export type RelationConfidence = "high" | "medium" | "low";

export interface EntityRelation {
  sourceEntityId: string;
  targetEntityId: string;
  relationType: RelationType;
  provenance: RelationProvenance;
  confidence: RelationConfidence;
  reasons: string[]; // RO, explainable evidence
}

// ── raw CMS input (shapes mirror the real tables) ────────────────────────────────
export interface RelationInput {
  bonuses: { id: string; casinoId: string | null; bonusTypeId: string | null }[];
  casinoGames: { casinoId: string; gameId: string }[];
  games: { id: string; providerId: string | null }[];
  casinoPayments: { casinoId: string; paymentMethodId: string }[];
  casinoTags: { casinoId: string; tagId: string }[];
  casinoLicenses: { casinoId: string; license: string | null }[];
}

const EID = (type: string, cmsId: string) => `${type}:${cmsId}`;
/** License pseudo-entity id (no registry entity exists for a license value). */
export const licenseEntityId = (value: string) => `license:${normalizeKeyword(value)}`;

/**
 * Build the entity relations from raw CMS rows. Deterministic, de-duplicated. When `knownEntityIds`
 * is provided, relations whose source or target entity is unknown (orphan FK) are dropped — the
 * `license:*` pseudo-target is exempt (it is derived from a column, not a registry row).
 */
export function buildEntityRelations(input: RelationInput, knownEntityIds?: ReadonlySet<string>): EntityRelation[] {
  const seen = new Set<string>();
  const out: EntityRelation[] = [];

  const push = (
    sourceEntityId: string,
    targetEntityId: string,
    relationType: RelationType,
    provenance: RelationProvenance,
    confidence: RelationConfidence,
    reasons: string[],
  ) => {
    if (!sourceEntityId || !targetEntityId) return;
    if (knownEntityIds) {
      if (!knownEntityIds.has(sourceEntityId)) return; // orphan source
      if (!targetEntityId.startsWith("license:") && !knownEntityIds.has(targetEntityId)) return; // orphan target
    }
    const key = `${sourceEntityId}|${relationType}|${targetEntityId}`;
    if (seen.has(key)) return; // dedupe
    seen.add(key);
    out.push({ sourceEntityId, targetEntityId, relationType, provenance, confidence, reasons });
  };

  for (const b of input.bonuses) {
    if (b.id && b.casinoId) {
      push(EID("casino", b.casinoId), EID("bonus", b.id), "casino_bonus", "verified_db", "high", ["bonuses.casino_id (FK)."]);
    }
    if (b.id && b.bonusTypeId) {
      push(EID("bonus", b.id), EID("bonus_type", b.bonusTypeId), "bonus_bonus_type", "verified_db", "high", ["bonuses.bonus_type_id (FK)."]);
    }
    if (b.casinoId && b.bonusTypeId) {
      // 2-hop composite via the bonuses row — factual but not a single FK → derived_cms.
      push(EID("casino", b.casinoId), EID("bonus_type", b.bonusTypeId), "casino_bonus_type", "derived_cms", "high", ["Derivat: casino are cel puțin un bonus de acest tip (join bonuses.casino_id + bonus_type_id)."]);
    }
  }
  for (const r of input.casinoGames) {
    push(EID("casino", r.casinoId), EID("game", r.gameId), "casino_game", "verified_db", "high", ["casino_games (junction)."]);
  }
  for (const g of input.games) {
    if (g.id && g.providerId) {
      push(EID("game", g.id), EID("provider", g.providerId), "game_provider", "verified_db", "high", ["games.provider_id (FK)."]);
    }
  }
  for (const r of input.casinoPayments) {
    push(EID("casino", r.casinoId), EID("payment", r.paymentMethodId), "casino_payment", "verified_db", "high", ["casino_payment_methods (junction)."]);
  }
  for (const r of input.casinoTags) {
    push(EID("casino", r.casinoId), EID("tag", r.tagId), "casino_tag", "verified_db", "high", ["casino_tags (junction)."]);
  }
  for (const l of input.casinoLicenses) {
    const val = l.license?.trim();
    if (l.casinoId && val) {
      // The column holds the value literally (derived_cms); the ONJN *classification* would be an
      // inferred_rule and is intentionally NOT asserted here.
      push(EID("casino", l.casinoId), licenseEntityId(val), "casino_license", "derived_cms", "high", [`casinos.license = „${val}" (valoare din coloană, nu FK).`]);
    }
  }

  return out.sort(
    (a, b) =>
      a.sourceEntityId.localeCompare(b.sourceEntityId) ||
      a.relationType.localeCompare(b.relationType) ||
      a.targetEntityId.localeCompare(b.targetEntityId),
  );
}

/** Group relations by source entity id (stable, for consumers like topical coverage). */
export function relationsBySource(relations: EntityRelation[]): Map<string, EntityRelation[]> {
  const m = new Map<string, EntityRelation[]>();
  for (const r of relations) {
    const list = m.get(r.sourceEntityId) ?? [];
    list.push(r);
    m.set(r.sourceEntityId, list);
  }
  return m;
}
