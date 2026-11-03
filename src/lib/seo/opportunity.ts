/**
 * KE-1B Opportunity Scoring — PURE, DETERMINISTIC, EXPLAINABLE, no I/O, no AI/SERP/GSC.
 *
 * Prioritizes SEO opportunities per cluster from signals we actually have: keyword demand
 * (volume), feasibility (KD), content-gap (KE-1A coverage state) and search intent. Every number
 * is derived from real data — nothing is fabricated. A missing metric is EXCLUDED from the
 * denominator and the remaining weights are renormalized (it is never silently treated as 0).
 *
 * Base weights: demand 35%, content_gap 30%, feasibility 20%, intent 15%.
 */

import { intentBuckets } from "@/lib/seo/clustering";
import type { CoverageState, CoverageConfidence } from "@/lib/seo/coverage";

export type OpportunityFactor = "demand" | "content_gap" | "feasibility" | "intent";

export const OPPORTUNITY_WEIGHTS: Record<OpportunityFactor, number> = {
  demand: 0.35,
  content_gap: 0.30,
  feasibility: 0.20,
  intent: 0.15,
};

/**
 * Demand reference for log-normalization: a cluster whose (deduped) keyword volumes sum to this
 * reaches demand≈1. Documented constant (NOT fitted to data); lets volume map onto 0..1 without a
 * global max. 100k monthly searches is a strong head for the RO casino vertical.
 */
export const VOLUME_REF = 100_000;

/** Intent value for a casino-affiliate site. Documented, explicit; unknown intent → missing. */
export const INTENT_VALUE: Record<"informational" | "commercial" | "transactional" | "navigational", number> = {
  transactional: 1.0, // ready to act (claim/sign-up) → highest affiliate value
  commercial: 0.8, // comparison/evaluation → high value
  informational: 0.5, // top-funnel / EEAT → mid value
  navigational: 0.4, // brand lookups → lower incremental value
};

/**
 * Content-gap value from the KE-1A coverage state. gap > planned > ambiguous > candidate > covered.
 * `opportunityType` differentiates NEW-page creation from optimization/publish/review.
 */
export const GAP_VALUE: Record<CoverageState, number> = {
  gap: 1.0, // no page → create new (biggest opportunity)
  planned: 0.7, // draft exists → finish/publish (high value, lower effort)
  ambiguous: 0.5, // needs an editorial decision
  candidate: 0.4, // page exists, likely optimize/confirm
  covered: 0.05, // already covered → minimal opportunity
};

export type OpportunityType = "create" | "publish" | "optimize" | "review";
const OPPORTUNITY_TYPE: Record<CoverageState, OpportunityType> = {
  gap: "create", planned: "publish", candidate: "optimize", covered: "optimize", ambiguous: "review",
};

export interface OpportunityKeyword {
  keyword: string; // used to dedupe identical keywords (no artificial volume doubling)
  volume: number | null;
  difficulty: number | null; // KD 0..100
  intent: string | null;
}

export interface OpportunityInput {
  coverageState: CoverageState;
  coverageConfidence: CoverageConfidence;
  keywords: OpportunityKeyword[];
}

export interface FactorBreakdown {
  factor: OpportunityFactor;
  weight: number; // BASE weight (before renormalization)
  normalizedValue: number | null; // 0..1, null when the factor is missing
  contribution: number; // points added to the final score (after renormalization), 0..100 scale
  availability: "available" | "missing";
}

export interface OpportunityScore {
  score: number; // 0..100 integer
  confidence: CoverageConfidence;
  opportunityType: OpportunityType;
  breakdown: FactorBreakdown[];
  missingFactors: OpportunityFactor[];
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const round = (x: number, d: number) => { const p = 10 ** d; return Math.round(x * p) / p; };
const isNum = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);

/** Demand: sum of DEDUPED keyword volumes (identical keywords counted once → no doubling), log-normalized. */
function demandNorm(keywords: OpportunityKeyword[]): number | null {
  const volByKeyword = new Map<string, number>();
  for (const k of keywords) {
    if (!isNum(k.volume)) continue;
    const key = (k.keyword ?? "").trim().toLowerCase();
    volByKeyword.set(key, Math.max(volByKeyword.get(key) ?? 0, Math.max(0, k.volume))); // dedupe → keep max, never add twice
  }
  if (volByKeyword.size === 0) return null; // no real volume anywhere → missing (not 0)
  const sum = [...volByKeyword.values()].reduce((a, b) => a + b, 0);
  return clamp01(Math.log10(1 + sum) / Math.log10(1 + VOLUME_REF)); // sum=0 (real zeros) → 0, available
}

/** Feasibility: 1 − (average known KD / 100). Missing KD excluded; KD 0 real → feasibility 1. */
function feasibilityNorm(keywords: OpportunityKeyword[]): number | null {
  const kds = keywords.map((k) => k.difficulty).filter(isNum).map((d) => Math.min(100, Math.max(0, d)));
  if (kds.length === 0) return null; // KD unknown → missing (NOT assumed 0)
  const avg = kds.reduce((a, b) => a + b, 0) / kds.length;
  return clamp01(1 - avg / 100);
}

/** Intent: dominant known bucket across keywords → documented value. Unknown everywhere → missing. */
function intentNorm(keywords: OpportunityKeyword[]): number | null {
  const counts = new Map<keyof typeof INTENT_VALUE, number>();
  for (const k of keywords) for (const b of intentBuckets(k.intent)) counts.set(b, (counts.get(b) ?? 0) + 1);
  if (counts.size === 0) return null; // no known intent → missing
  let best: keyof typeof INTENT_VALUE | null = null;
  let bestN = -1;
  for (const b of ["transactional", "commercial", "navigational", "informational"] as (keyof typeof INTENT_VALUE)[]) {
    const n = counts.get(b) ?? 0;
    if (n > bestN) { bestN = n; best = b; }
  }
  return INTENT_VALUE[best!];
}

const CONF_RANK: Record<CoverageConfidence, number> = { low: 0, medium: 1, high: 2 };
const CONF_BY_RANK: CoverageConfidence[] = ["low", "medium", "high"];
const minConfidence = (a: CoverageConfidence, b: CoverageConfidence): CoverageConfidence =>
  CONF_BY_RANK[Math.min(CONF_RANK[a], CONF_RANK[b])];

/**
 * Score a single cluster's opportunity (0..100) with an explainable breakdown. Deterministic;
 * handles empty clusters, nulls, real 0 volume/KD and invalid numbers (treated as missing/clamped).
 */
export function scoreOpportunity(input: OpportunityInput): OpportunityScore {
  const kws = input.keywords ?? [];
  const norms: Record<OpportunityFactor, number | null> = {
    demand: demandNorm(kws),
    content_gap: GAP_VALUE[input.coverageState], // always available (coverage state is always known)
    feasibility: feasibilityNorm(kws),
    intent: intentNorm(kws),
  };

  const factors: OpportunityFactor[] = ["demand", "content_gap", "feasibility", "intent"];
  const available = factors.filter((f) => norms[f] !== null);
  const availableWeight = available.reduce((s, f) => s + OPPORTUNITY_WEIGHTS[f], 0);

  const breakdown: FactorBreakdown[] = factors.map((f) => {
    const nv = norms[f];
    if (nv === null || availableWeight === 0) {
      return { factor: f, weight: OPPORTUNITY_WEIGHTS[f], normalizedValue: nv === null ? null : round(nv, 4), contribution: 0, availability: nv === null ? "missing" : "available" };
    }
    const contribution = (OPPORTUNITY_WEIGHTS[f] / availableWeight) * nv * 100; // renormalized
    return { factor: f, weight: OPPORTUNITY_WEIGHTS[f], normalizedValue: round(nv, 4), contribution: round(contribution, 2), availability: "available" };
  });

  const score = Math.round(breakdown.reduce((s, b) => s + b.contribution, 0));
  const missingFactors = factors.filter((f) => norms[f] === null);

  // Confidence: completeness of the OPTIONAL metrics (demand/feasibility/intent), capped by the
  // coverage confidence. No SERP/GSC → we never claim verified organic coverage.
  const optionalAvailable = (["demand", "feasibility", "intent"] as OpportunityFactor[]).filter((f) => norms[f] !== null).length;
  const metricTier: CoverageConfidence = optionalAvailable >= 3 ? "high" : optionalAvailable === 2 ? "medium" : "low";

  return {
    score: Math.min(100, Math.max(0, score)),
    confidence: minConfidence(metricTier, input.coverageConfidence),
    opportunityType: OPPORTUNITY_TYPE[input.coverageState],
    breakdown,
    missingFactors,
  };
}
