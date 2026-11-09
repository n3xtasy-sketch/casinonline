import { test } from "node:test";
import assert from "node:assert/strict";
import { makeVariantInput, buildABExperiment, summarizeVariantResult, compareAB } from "@/lib/ai/ab-experiment";
import type { ContentPromptInput } from "@/lib/ai/content-prompt";
import type { AuthorKnowledge } from "@/lib/ai/author-knowledge";
import type { SectionGenerationResult } from "@/lib/ai/generate-section";

const AK: AuthorKnowledge = {
  id: "wagering-basis-explainer", category: "expert_explanation", title: "Baza de calcul a rulajului",
  content: "Rulajul arata de cate ori trebuie pariata o suma inainte de retragere.",
  author: "radu-bogdan-gabriel", provenance: "author_expertise", status: "published", applicability: { topics: ["rulaj"] },
};
const BRIEF = {
  title: "Bonus fara depunere", primaryKeyword: "bonus fara depunere", secondaryKeywords: ["rotiri gratuite"],
  intent: "commercial", targetUrl: "/bonusuri/bonus-fara-depunere", h1: "Bonusuri fara depunere",
  outline: [{ level: 2 as const, heading: "Cum functioneaza rulajul", keywords: ["rulaj"], note: "" }], entities: [], faq: [],
};
const INPUT: ContentPromptInput = {
  pageType: "bonus_category", brief: BRIEF, cmsEntities: [], cmsRelations: [],
  internalLinks: [{ url: "/bonusuri/bonus-fara-depunere", title: "Fara depunere" }], cmsFacts: [],
  authorKnowledge: [AK], sectionId: "s0-cum-functioneaza-rulajul",
};

test("makeVariantInput: A strips Author Knowledge, B is unchanged, input is NOT mutated", () => {
  const a = makeVariantInput(INPUT, "A");
  const b = makeVariantInput(INPUT, "B");
  assert.deepEqual(a.authorKnowledge, []);
  assert.deepEqual(b.authorKnowledge, [AK]);
  assert.deepEqual(INPUT.authorKnowledge, [AK]); // no side effect on the original
});

test("buildABExperiment: full prompt parity (only Author Knowledge differs)", () => {
  const plan = buildABExperiment(INPUT)!;
  assert.equal(plan.parity.ok, true);
  assert.equal(plan.parity.systemIdentical, true);
  assert.equal(plan.parity.userIdenticalExceptKnowledge, true);
  assert.equal(plan.parity.aHasNoKnowledgeBlock, true);
  assert.equal(plan.parity.bHasKnowledgeBlock, true);
  assert.equal(plan.parity.outputContractIdentical, true);
  assert.equal(plan.parity.maxTokensIdentical, true);
});

test("isolation: Author Knowledge does not change the factual sources or CMS context", () => {
  const plan = buildABExperiment(INPUT)!;
  assert.equal(plan.parity.factualSourcesIdentical, true);
  assert.equal(plan.parity.cmsContextIdentical, true);
  assert.equal(plan.parity.warningsIdentical, true);
});

test("token delta is attributable to the knowledge block (B > A), and B's selection is reported", () => {
  const plan = buildABExperiment(INPUT)!;
  assert.ok(plan.estInputTokensB > plan.estInputTokensA);
  assert.equal(plan.knowledgeTokenDelta, plan.estInputTokensB - plan.estInputTokensA);
  assert.deepEqual(plan.knowledge.selectedKnowledgeIds, ["wagering-basis-explainer"]);
  assert.ok(plan.knowledge.estimatedKnowledgeTokens > 0);
});

test("reproducible: building the experiment twice yields identical plans (deterministic hashes)", () => {
  assert.deepEqual(buildABExperiment(INPUT), buildABExperiment(INPUT));
  const plan = buildABExperiment(INPUT)!;
  assert.notEqual(plan.promptHashA, plan.promptHashB); // A and B prompts genuinely differ
});

test("empty selection → block omitted → A and B prompts are identical (degenerate B)", () => {
  const plan = buildABExperiment({ ...INPUT, authorKnowledge: [] })!;
  assert.equal(plan.promptHashA, plan.promptHashB);
  assert.equal(plan.parity.aHasNoKnowledgeBlock, true);
  assert.equal(plan.knowledge.selectedKnowledgeCount, 0);
});

test("nonexistent section → null (no experiment)", () => {
  assert.equal(buildABExperiment({ ...INPUT, sectionId: "nope" }), null);
});

// ── result summarisation + comparison (used after real generation) ──────────────
const result = (over: Partial<SectionGenerationResult>): SectionGenerationResult => ({
  ok: true, section: { sectionId: "s", heading: "h", content: "text de lungime oarecare", keywordsUsed: [], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [] },
  validation: { ok: true, errors: [], warnings: [], claimChecks: [] }, promptWarnings: [], error: null, errorKind: null,
  usage: { inputTokens: 2500, outputTokens: 800 }, model: "claude-sonnet-5", stopReason: "tool_use",
  cost: null, editorial: { warnings: [], suggestions: [] }, knowledge: { selectedKnowledgeIds: [], selectedKnowledgeCount: 0, estimatedKnowledgeTokens: 0 }, ...over,
});

test("summarizeVariantResult: extracts the comparable metrics (claim verdict counts included)", () => {
  const s = summarizeVariantResult("B", result({ validation: { ok: true, errors: [], warnings: ["w"], claimChecks: [{ claim: "c", verdict: "supported" }, { claim: "d", verdict: "unverifiable" }] } }));
  assert.equal(s.variant, "B");
  assert.equal(s.claimCounts.supported, 1);
  assert.equal(s.claimCounts.unverifiable, 1);
  assert.equal(s.validationWarningCount, 1);
  assert.equal(s.inputTokens, 2500);
});

test("compareAB: deltas (B − A) + guardrail that B adds no new factual errors", () => {
  const a = summarizeVariantResult("A", result({ usage: { inputTokens: 2000, outputTokens: 700 }, section: { sectionId: "s", heading: "h", content: "scurt", keywordsUsed: [], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [] } }));
  const b = summarizeVariantResult("B", result({ usage: { inputTokens: 2500, outputTokens: 900 }, section: { sectionId: "s", heading: "h", content: "text mai lung cu detalii", keywordsUsed: [], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [] } }));
  const c = compareAB(a, b);
  assert.equal(c.deltaOutputTokens, 200);
  assert.ok(c.deltaTextLength > 0);
  assert.equal(c.bAddsNoFactualErrors, true);
  // B with an invented claim → guardrail trips
  const bBad = summarizeVariantResult("B", result({ ok: false, errorKind: "invalid_output", validation: { ok: false, errors: ["x"], warnings: [], claimChecks: [{ claim: "c", verdict: "invented" }] } }));
  assert.equal(compareAB(a, bBad).bAddsNoFactualErrors, false);
});
