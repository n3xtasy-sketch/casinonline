/**
 * AI-2.6.1 Fact-scoping diagnostic — PURE, DETERMINISTIC, no I/O, no secrets.
 *
 * Explains WHY a brief got (or did not get) verified CMS facts: which entities were auto-discovered vs
 * selected, how many facts are available, which facts were excluded and why, which are expired, and
 * whether the category ended up with no data. It serializes NO prompt text, NO keys, NO CMS content
 * beyond stable ids/factIds — purely the scoping decision metadata, safe to log/inspect server-side.
 */

import { factAllowedEntityIds, type CmsFact, type ScopedFactContext } from "@/lib/ai/cms-facts";

export interface ExcludedFact {
  factId: string;
  entityId: string;
  reason: "entitate in afara scope-ului brief" | "peste cap (DATA_CAPS.cmsFacts)";
}

export interface FactScopingDiagnostic {
  pageType: string;
  targetUrl: string | null;
  /** Editorially-confirmed brief entities (distinct from auto-discovered). */
  confirmedEntityCount: number;
  /** Scoped CMS entities (confirmed/mentionable). */
  selectedEntityIds: string[];
  /** Reverse-discovered entities (AI-2.6.1) — NON-confirmed; surface facts only. */
  discoveredEntityIds: string[];
  /** Facts actually passed to the model (after scope + cap). */
  availableFactCount: number;
  /** Facts relevant to the brief graph before the cap. */
  totalRelevantFactCount: number;
  /** Relevant facts dropped purely by the cap. */
  cappedOut: number;
  /** Excluded facts + reason (bounded list). */
  excludedFacts: ExcludedFact[];
  /** Count of excluded facts beyond the bounded list. */
  excludedOverflow: number;
  /** Selected facts flagged expired (not to be presented as active). */
  expiredFactIds: string[];
  /** True when the category received zero facts. */
  emptyCategory: boolean;
}

const EXCLUDED_LIST_CAP = 50;

export function buildFactScopingDiagnostic(args: {
  pageType: string;
  targetUrl: string | null;
  confirmedEntityCount: number;
  allFacts: CmsFact[];
  scoped: ScopedFactContext;
  selectedFacts: CmsFact[];
  totalRelevant: number;
}): FactScopingDiagnostic {
  const { pageType, targetUrl, confirmedEntityCount, allFacts, scoped, selectedFacts, totalRelevant } = args;
  const allowed = factAllowedEntityIds(scoped);
  const selectedIds = new Set(selectedFacts.map((f) => f.factId));

  const excludedAll: ExcludedFact[] = allFacts
    .filter((f) => !selectedIds.has(f.factId))
    .map((f) => ({
      factId: f.factId,
      entityId: f.entityId,
      reason: allowed.has(f.entityId) ? ("peste cap (DATA_CAPS.cmsFacts)" as const) : ("entitate in afara scope-ului brief" as const),
    }));

  return {
    pageType,
    targetUrl,
    confirmedEntityCount,
    selectedEntityIds: scoped.cmsEntities.map((e) => e.id),
    discoveredEntityIds: (scoped.discoveredEntities ?? []).map((e) => e.id),
    availableFactCount: selectedFacts.length,
    totalRelevantFactCount: totalRelevant,
    cappedOut: Math.max(0, totalRelevant - selectedFacts.length),
    excludedFacts: excludedAll.slice(0, EXCLUDED_LIST_CAP),
    excludedOverflow: Math.max(0, excludedAll.length - EXCLUDED_LIST_CAP),
    expiredFactIds: selectedFacts.filter((f) => f.status === "expired").map((f) => f.factId),
    emptyCategory: selectedFacts.length === 0,
  };
}
