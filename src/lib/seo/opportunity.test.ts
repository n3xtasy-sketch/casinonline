import { test } from "node:test";
import assert from "node:assert/strict";

import {
  scoreOpportunity, OPPORTUNITY_WEIGHTS, type OpportunityInput, type OpportunityKeyword, type OpportunityFactor,
} from "@/lib/seo/opportunity";
import type { CoverageState, CoverageConfidence } from "@/lib/seo/coverage";

function kw(over: Partial<OpportunityKeyword> = {}): OpportunityKeyword {
  return { keyword: over.keyword ?? "k", volume: over.volume ?? null, difficulty: over.difficulty ?? null, intent: over.intent ?? null };
}
function inp(state: CoverageState, confidence: CoverageConfidence, keywords: OpportunityKeyword[]): OpportunityInput {
  return { coverageState: state, coverageConfidence: confidence, keywords };
}
const bf = (r: ReturnType<typeof scoreOpportunity>, f: OpportunityFactor) => r.breakdown.find((b) => b.factor === f)!;

// ── full signal → 100 ───────────────────────────────────────────────────────────
test("all factors maxed → score 100, high confidence, nothing missing", () => {
  const r = scoreOpportunity(inp("gap", "high", [kw({ volume: 100000, difficulty: 0, intent: "transactional" })]));
  assert.equal(r.score, 100);
  assert.equal(r.confidence, "high");
  assert.deepEqual(r.missingFactors, []);
  assert.equal(r.opportunityType, "create");
});

// ── base weights: all norm=1 → contributions equal the base weights×100 ─────────
test("with all factors available the base weights sum to 100", () => {
  const r = scoreOpportunity(inp("gap", "high", [kw({ volume: 100000, difficulty: 0, intent: "transactional" })]));
  assert.equal(bf(r, "demand").contribution, 35);
  assert.equal(bf(r, "content_gap").contribution, 30);
  assert.equal(bf(r, "feasibility").contribution, 20);
  assert.equal(bf(r, "intent").contribution, 15);
  assert.ok(Math.abs(Object.values(OPPORTUNITY_WEIGHTS).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

// ── coverage-state ordering: gap > planned > ambiguous > candidate > covered ────
test("content-gap state orders the score (others held constant)", () => {
  const kws = [kw({ volume: 1000, difficulty: 50, intent: "commercial" })];
  const s = (st: CoverageState) => scoreOpportunity(inp(st, "high", kws)).score;
  const [g, p, a, c, cov] = (["gap", "planned", "ambiguous", "candidate", "covered"] as CoverageState[]).map(s);
  assert.ok(g > p && p > a && a > c && c > cov, `expected gap>planned>ambiguous>candidate>covered, got ${g},${p},${a},${c},${cov}`);
});

// ── missing demand → excluded + renormalized + flagged + confidence reduced ─────
test("missing volume everywhere → demand excluded, weights renormalized, demand in missingFactors", () => {
  const r = scoreOpportunity(inp("gap", "high", [kw({ volume: null, difficulty: 20, intent: "commercial" })]));
  assert.equal(bf(r, "demand").availability, "missing");
  assert.equal(bf(r, "demand").contribution, 0);
  assert.ok(r.missingFactors.includes("demand"));
  // remaining weights (0.30+0.20+0.15=0.65) renormalized → content_gap contribution = 0.30/0.65*1*100
  assert.equal(bf(r, "content_gap").contribution, Number((0.30 / 0.65 * 100).toFixed(2)));
  assert.equal(r.confidence, "medium"); // 2 optional metrics present
});

// ── empty cluster → only content_gap, confidence low, no crash ──────────────────
test("empty cluster → only content_gap available; gap→100, low confidence", () => {
  const r = scoreOpportunity(inp("gap", "high", []));
  assert.equal(r.score, 100); // content_gap renormalized to weight 1.0, gap value 1.0
  assert.equal(r.confidence, "low");
  assert.deepEqual(r.missingFactors.sort(), ["demand", "feasibility", "intent"]);
  const covered = scoreOpportunity(inp("covered", "high", []));
  assert.equal(covered.score, 5); // 1.0 * 0.05 * 100
});

// ── intent unknown stays missing (not fabricated) ───────────────────────────────
test("unknown intent → intent missing, not invented", () => {
  const r = scoreOpportunity(inp("gap", "high", [kw({ volume: 500, difficulty: 30, intent: null })]));
  assert.equal(bf(r, "intent").availability, "missing");
  assert.equal(bf(r, "intent").normalizedValue, null);
  assert.ok(r.missingFactors.includes("intent"));
});

// ── KD missing is NOT treated as 0 ──────────────────────────────────────────────
test("missing KD → feasibility missing (not assumed easy)", () => {
  const r = scoreOpportunity(inp("gap", "high", [kw({ volume: 500, difficulty: null, intent: "commercial" })]));
  assert.equal(bf(r, "feasibility").availability, "missing");
  assert.ok(r.missingFactors.includes("feasibility"));
});

// ── real zeros: volume 0 and KD 0 are AVAILABLE (not missing) ────────────────────
test("real 0 volume is available (norm 0); real 0 KD is available (feasibility 1)", () => {
  const r = scoreOpportunity(inp("gap", "high", [kw({ volume: 0, difficulty: 0, intent: "commercial" })]));
  assert.equal(bf(r, "demand").availability, "available");
  assert.equal(bf(r, "demand").normalizedValue, 0);
  assert.equal(bf(r, "feasibility").availability, "available");
  assert.equal(bf(r, "feasibility").normalizedValue, 1);
});

// ── invalid numbers: NaN volume → missing; negative volume → clamped to 0 ───────
test("NaN volume → missing; negative volume → clamped to 0 (available)", () => {
  assert.equal(bf(scoreOpportunity(inp("gap", "high", [kw({ volume: NaN })])), "demand").availability, "missing");
  const neg = bf(scoreOpportunity(inp("gap", "high", [kw({ volume: -5, difficulty: 10 })])), "demand");
  assert.equal(neg.availability, "available");
  assert.equal(neg.normalizedValue, 0);
});

// ── dedup: identical keywords are NOT doubled (point 5) ──────────────────────────
test("identical keywords are deduped (no artificial volume doubling)", () => {
  const dup = bf(scoreOpportunity(inp("gap", "high", [kw({ keyword: "x", volume: 1000 }), kw({ keyword: "X", volume: 1000 })])), "demand");
  const single = bf(scoreOpportunity(inp("gap", "high", [kw({ keyword: "x", volume: 1000 })])), "demand");
  assert.equal(dup.normalizedValue, single.normalizedValue); // identical → counted once
  const distinct = bf(scoreOpportunity(inp("gap", "high", [kw({ keyword: "x", volume: 1000 }), kw({ keyword: "y", volume: 1000 })])), "demand");
  assert.ok(distinct.normalizedValue! > single.normalizedValue!); // distinct keywords DO add up
});

// ── confidence capped by coverage confidence (no fake organic validation) ───────
test("confidence = min(metric completeness, coverage confidence)", () => {
  // full metrics (metric tier high) but coverage medium → medium
  const r = scoreOpportunity(inp("gap", "medium", [kw({ volume: 1000, difficulty: 30, intent: "commercial" })]));
  assert.equal(r.confidence, "medium");
  // full metrics + coverage low → low
  assert.equal(scoreOpportunity(inp("gap", "low", [kw({ volume: 1000, difficulty: 30, intent: "commercial" })])).confidence, "low");
});

// ── bounds + determinism ─────────────────────────────────────────────────────────
test("score always within 0..100 and deterministic", () => {
  const cases: OpportunityInput[] = [
    inp("gap", "high", [kw({ volume: 999999, difficulty: 0, intent: "transactional" })]),
    inp("covered", "low", [kw({ volume: 0, difficulty: 100, intent: "navigational" })]),
    inp("ambiguous", "medium", []),
  ];
  for (const c of cases) {
    const r = scoreOpportunity(c);
    assert.ok(r.score >= 0 && r.score <= 100, `score out of range: ${r.score}`);
    assert.deepEqual(scoreOpportunity(c), r); // deterministic
  }
});

// ── opportunityType reflects the coverage state ─────────────────────────────────
test("opportunityType maps the coverage state", () => {
  assert.equal(scoreOpportunity(inp("gap", "high", [])).opportunityType, "create");
  assert.equal(scoreOpportunity(inp("planned", "high", [])).opportunityType, "publish");
  assert.equal(scoreOpportunity(inp("candidate", "high", [])).opportunityType, "optimize");
  assert.equal(scoreOpportunity(inp("ambiguous", "high", [])).opportunityType, "review");
});
