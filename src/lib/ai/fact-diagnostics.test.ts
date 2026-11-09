import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFactScopingDiagnostic } from "@/lib/ai/fact-diagnostics";
import type { CmsFact } from "@/lib/ai/cms-facts";

const f = (over: Partial<CmsFact> = {}): CmsFact => ({
  factId: "bonus:b1:wagering", entityId: "bonus:b1", entityName: "Bonus Netbet",
  claim: "rulaj", value: "30x", field: "bonuses.wagering_multiplier",
  verifiedAt: "2026-06-01", sourceRef: "https://x/terms", status: "verified", ...over,
});

test("diagnostic reports discovered vs selected entities, available facts, empty flag", () => {
  const inScope = f({ factId: "bonus:b1:w", entityId: "bonus:b1" });
  const d = buildFactScopingDiagnostic({
    pageType: "bonus_category", targetUrl: "/bonusuri/bonus-fara-depunere", confirmedEntityCount: 0,
    allFacts: [inScope], selectedFacts: [inScope], totalRelevant: 1,
    scoped: { cmsEntities: [{ id: "bonus_type:nodep" }], cmsRelations: [{ sourceEntityId: "bonus:b1", targetEntityId: "bonus_type:nodep" }], discoveredEntities: [{ id: "bonus:b1" }] },
  });
  assert.deepEqual(d.selectedEntityIds, ["bonus_type:nodep"]);
  assert.deepEqual(d.discoveredEntityIds, ["bonus:b1"]);
  assert.equal(d.availableFactCount, 1);
  assert.equal(d.emptyCategory, false);
  assert.equal(d.confirmedEntityCount, 0);
});

test("excluded facts carry the correct reason: out-of-scope vs capped", () => {
  const inScope = f({ factId: "bonus:b1:w", entityId: "bonus:b1" });
  const outScope = f({ factId: "bonus:zz:w", entityId: "bonus:zz" }); // entity not in allowed
  const d = buildFactScopingDiagnostic({
    pageType: "bonus_category", targetUrl: null, confirmedEntityCount: 0,
    allFacts: [inScope, outScope], selectedFacts: [inScope], totalRelevant: 1,
    scoped: { cmsEntities: [], cmsRelations: [], discoveredEntities: [{ id: "bonus:b1" }] },
  });
  assert.ok(d.excludedFacts.some((x) => x.factId === "bonus:zz:w" && /afara scope-ului/.test(x.reason)));
});

test("capped-out facts are reasoned as cap, not out-of-scope", () => {
  const a = f({ factId: "bonus:b1:a", entityId: "bonus:b1" });
  const b = f({ factId: "bonus:b1:b", entityId: "bonus:b1" });
  const d = buildFactScopingDiagnostic({
    pageType: "bonus_category", targetUrl: null, confirmedEntityCount: 0,
    allFacts: [a, b], selectedFacts: [a], totalRelevant: 2, // b relevant but dropped by cap
    scoped: { cmsEntities: [{ id: "bonus:b1" }], cmsRelations: [], discoveredEntities: [] },
  });
  assert.equal(d.cappedOut, 1);
  assert.ok(d.excludedFacts.some((x) => x.factId === "bonus:b1:b" && /peste cap/.test(x.reason)));
});

test("expired selected facts are listed; empty category is flagged", () => {
  const exp = f({ factId: "bonus:b1:w", entityId: "bonus:b1", status: "expired" });
  const d1 = buildFactScopingDiagnostic({
    pageType: "bonus_category", targetUrl: null, confirmedEntityCount: 0,
    allFacts: [exp], selectedFacts: [exp], totalRelevant: 1,
    scoped: { cmsEntities: [{ id: "bonus:b1" }], cmsRelations: [], discoveredEntities: [] },
  });
  assert.deepEqual(d1.expiredFactIds, ["bonus:b1:w"]);

  const d2 = buildFactScopingDiagnostic({
    pageType: "bonus_category", targetUrl: null, confirmedEntityCount: 0,
    allFacts: [], selectedFacts: [], totalRelevant: 0,
    scoped: { cmsEntities: [{ id: "bonus_type:nodep" }], cmsRelations: [], discoveredEntities: [] },
  });
  assert.equal(d2.emptyCategory, true);
});

test("diagnostic serializes no prompt text / secrets — only ids + counts + reasons", () => {
  const d = buildFactScopingDiagnostic({
    pageType: "bonus_category", targetUrl: null, confirmedEntityCount: 0,
    allFacts: [f()], selectedFacts: [f()], totalRelevant: 1,
    scoped: { cmsEntities: [], cmsRelations: [], discoveredEntities: [{ id: "bonus:b1" }] },
  });
  const json = JSON.stringify(d);
  assert.doesNotMatch(json, /\[TASK\]|systemPrompt|userPrompt|ANTHROPIC|sk-ant/i);
});
