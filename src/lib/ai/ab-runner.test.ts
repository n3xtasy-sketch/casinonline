import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildVirtualSectionInputs, runABExperiment, dryRunComplete, AB_SECTION_SPECS, LIVE_AUTH_TOKEN,
} from "@/lib/ai/ab-runner";
import { readFileSync } from "node:fs";
import type { ContentPromptInput } from "@/lib/ai/content-prompt";
import type { CompleteFn } from "@/lib/ai/generate-section";

test("ab-runner never imports the Anthropic SDK (real calls only via an injected complete)", () => {
  const src = readFileSync(`${process.cwd()}/src/lib/ai/ab-runner.ts`, "utf8");
  assert.doesNotMatch(src, /@anthropic-ai\/sdk/); // no SDK import
  assert.doesNotMatch(src, /createAnthropicComplete/); // does not build the live adapter itself
  assert.doesNotMatch(src, /sk-ant|ANTHROPIC_API_KEY/); // no key reference (the authorize token name is allowed)
});

const BASE: ContentPromptInput = {
  pageType: "bonus_category",
  brief: {
    title: "Bonus Fara Depunere la Cazinouri Online", primaryKeyword: "bonus fara depunere cazino",
    secondaryKeywords: ["bonus fara depunere 2026"], intent: "commercial",
    targetUrl: "/bonusuri/bonus-fara-depunere", h1: "Bonusuri fara depunere",
    outline: [{ level: 2, heading: "Bonusuri Cazino", keywords: [], note: "" }], entities: [], faq: [],
  },
  cmsEntities: [], cmsRelations: [], internalLinks: [{ url: "/bonusuri/bonus-fara-depunere", title: "Fara depunere" }],
  cmsFacts: [], discoveredEntities: [], authorKnowledge: [], sectionId: "intro",
};

test("buildVirtualSectionInputs: 3 sections with real brief context preserved + scoped knowledge per section", () => {
  const inputs = buildVirtualSectionInputs(BASE);
  assert.equal(inputs.length, 3);
  assert.deepEqual(inputs.map((i) => i.sectionId), ["s0-cum-functioneaza-rulajul", "s0-verificarea-identitatii-kyc", "faq"]);
  // real context preserved verbatim
  for (const i of inputs) {
    assert.equal(i.pageType, BASE.pageType);
    assert.equal(i.brief.primaryKeyword, BASE.brief.primaryKeyword);
    assert.equal(i.brief.intent, "commercial");
    assert.equal(i.cmsFacts, BASE.cmsFacts); // same reference → CMS Facts untouched
  }
  // each section got its own scoped knowledge (B)
  assert.ok(inputs[0].authorKnowledge!.some((k) => k.id === "wagering-basis-explainer"));
  assert.ok(inputs[1].authorKnowledge!.some((k) => k.id === "kyc-and-claiming"));
  assert.ok(inputs[2].authorKnowledge![0].id === "faq-writing-guidance");
});

test("buildVirtualSectionInputs does NOT mutate the base brief (no side effects)", () => {
  const before = JSON.stringify(BASE);
  buildVirtualSectionInputs(BASE);
  assert.equal(JSON.stringify(BASE), before);
});

test("DRY-RUN is the default and does NOT call the injected Anthropic complete (no accidental calls)", async () => {
  let called = 0;
  const spy: CompleteFn = async () => { called += 1; throw new Error("Anthropic must NOT be called in dry-run"); };
  const report = await runABExperiment(buildVirtualSectionInputs(BASE), { complete: spy });
  assert.equal(report.mode, "dry-run");
  assert.equal(called, 0); // the live complete was ignored
});

test("plans exactly 6 executions (3 sections × 2 variants) and completes them in dry-run", async () => {
  const report = await runABExperiment(buildVirtualSectionInputs(BASE));
  assert.equal(report.plannedRuns, 6);
  assert.equal(report.completedRuns, 6);
  assert.equal(report.rows.length, 3);
});

test("A/B parity in every row: A has no knowledge, B has scoped knowledge; same factual context", async () => {
  const report = await runABExperiment(buildVirtualSectionInputs(BASE));
  assert.equal(report.stoppedEarly, false);
  for (const row of report.rows) {
    assert.equal(row.a.knowledgeCount, 0); // A stripped
    assert.ok(row.b && row.b.knowledgeCount > 0); // B scoped
    assert.equal(row.editorialScores, null); // manual, not auto-computed
    // factual isolation: knowledge adds NO blocking factual error vs A
    assert.equal(row.comparison?.bAddsNoFactualErrors, true);
  }
});

// ── AI-2.9D.2C: generated-text access for editorial evaluation ──
test("the generated text is surfaced for BOTH variants (editorial evaluation), not just lengths", async () => {
  const report = await runABExperiment(buildVirtualSectionInputs(BASE));
  for (const row of report.rows) {
    assert.ok(typeof row.textA === "string" && row.textA.length > 0);
    assert.ok(typeof row.textB === "string" && row.textB!.length > 0);
    assert.equal(row.textA!.length, row.a.textLength); // consistent with the summary metric
  }
});

// ── AI-2.9D.2C: early abort on a fatal result (not on warnings) ──
const fatalThrow: CompleteFn = async () => { throw new Error("eroare API simulata"); };
const parseError: CompleteFn = async () => ({ output: null, stopReason: "end_turn", usage: { inputTokens: 10, outputTokens: 0 }, model: "x" });

test("early abort on an API error: stops before the next variants, preserves partial results", async () => {
  const inputs = buildVirtualSectionInputs(BASE);
  const report = await runABExperiment(inputs, { mode: "live", authorize: LIVE_AUTH_TOKEN, complete: fatalThrow });
  assert.equal(report.stoppedEarly, true);
  assert.equal(report.completedRuns, 1); // only A of the first section ran
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].b, null); // B never ran
  assert.match(report.stopReason ?? "", /A@.*api_error/);
});

test("AI-2.9D.2G: on invalid_output the full diagnostics propagate to the row and B is NOT run", async () => {
  // output is structurally valid but uses an internal link not in the allowlist → invalid_output
  const badLink: CompleteFn = async () => ({ output: { sectionId: "x", heading: "x", content: "Un text valid despre rulaj.", keywordsUsed: [], entitiesUsed: [], internalLinks: ["/evil-inventat"], factualClaims: [], warnings: [] }, stopReason: "tool_use", usage: { inputTokens: 100, outputTokens: 50 }, model: "x" });
  const report = await runABExperiment(buildVirtualSectionInputs(BASE).slice(0, 1), { mode: "live", authorize: LIVE_AUTH_TOKEN, complete: badLink });
  assert.equal(report.stoppedEarly, true);
  assert.equal(report.completedRuns, 1);
  assert.equal(report.rows[0].b, null); // B never ran (early-abort unchanged)
  assert.equal(report.rows[0].a.errorKind, "invalid_output");
  assert.ok(report.rows[0].a.validationErrors.some((e) => /Link intern inexistent\/inventat/.test(e))); // exact message surfaced
});

test("early abort on a fatal (parse) error after A succeeds is still bounded to partial results", async () => {
  const inputs = buildVirtualSectionInputs(BASE);
  const report = await runABExperiment(inputs, { mode: "live", authorize: LIVE_AUTH_TOKEN, complete: parseError });
  assert.equal(report.stoppedEarly, true);
  assert.equal(report.completedRuns, 1); // A of section 1 is fatal (parse_error) → stop
  assert.equal(report.rows[0].a.errorKind, "parse_error");
});

test("NON-fatal warnings (dry-run editorial/validation warnings) do NOT abort — all 6 run", async () => {
  const report = await runABExperiment(buildVirtualSectionInputs(BASE));
  assert.equal(report.stoppedEarly, false);
  assert.equal(report.completedRuns, 6); // warnings keep ok=true → no abort
  assert.equal(report.stopReason, null);
});

test("a validation WARNING (numeric without a sourced claim) keeps ok=true → experiment completes", async () => {
  // valid section with a number but no sourced claim → validation.warnings, ok stays true (not fatal)
  const warnOnly: CompleteFn = async ({ system, user }) => ({
    output: { sectionId: "x", heading: "x", content: "Un exemplu conceptual despre bonusuri, 50 lei mentionat fara sursa.", keywordsUsed: [], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [] },
    stopReason: "tool_use", usage: { inputTokens: Math.ceil((system.length + user.length) / 4), outputTokens: 12 }, model: "warn",
  });
  const report = await runABExperiment(buildVirtualSectionInputs(BASE).slice(0, 1), { mode: "live", authorize: LIVE_AUTH_TOKEN, complete: warnOnly });
  assert.equal(report.stoppedEarly, false);
  assert.equal(report.completedRuns, 2); // A + B both ran (warning is non-fatal)
});

test("zero side effects: the section inputs are not mutated by a run", async () => {
  const inputs = buildVirtualSectionInputs(BASE);
  const before = JSON.stringify(inputs);
  await runABExperiment(inputs);
  assert.equal(JSON.stringify(inputs), before);
});

test("reproducible: the dry-run report is deterministic across runs", async () => {
  const a = await runABExperiment(buildVirtualSectionInputs(BASE));
  const b = await runABExperiment(buildVirtualSectionInputs(BASE));
  assert.deepEqual(a, b);
});

test("LIVE run is guarded: missing authorization OR missing complete → throws (no silent fallback)", async () => {
  const inputs = buildVirtualSectionInputs(BASE);
  await assert.rejects(() => runABExperiment(inputs, { mode: "live" }), /neautorizata/);
  await assert.rejects(() => runABExperiment(inputs, { mode: "live", authorize: "wrong" }), /neautorizata/);
  await assert.rejects(() => runABExperiment(inputs, { mode: "live", authorize: LIVE_AUTH_TOKEN }), /lipseste functia complete/);
});

test("LIVE run with explicit authorization + injected complete uses that complete (still no SDK import here)", async () => {
  let called = 0;
  const fake: CompleteFn = async ({ system, user }) => {
    called += 1;
    return { output: { sectionId: "x", heading: "x", content: "continut live fals pentru test", keywordsUsed: [], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [] }, stopReason: "tool_use", usage: { inputTokens: Math.ceil((system.length + user.length) / 4), outputTokens: 10 }, model: "fake-live" };
  };
  const report = await runABExperiment(buildVirtualSectionInputs(BASE).slice(0, 1), { mode: "live", authorize: LIVE_AUTH_TOKEN, complete: fake });
  assert.equal(report.mode, "live");
  assert.equal(called, 2); // 1 section × A+B
});

test("spec list is the three required sections", () => {
  assert.equal(AB_SECTION_SPECS.length, 3);
  assert.deepEqual(AB_SECTION_SPECS.map((s) => s.kind), ["outline", "outline", "faq"]);
});

test("dryRunComplete emits a valid section with usage, never touching the network", async () => {
  const r = await dryRunComplete({ system: "sys", user: "usr", maxTokens: 1000 });
  assert.equal(r.model, "dry-run");
  assert.equal(r.stopReason, "tool_use");
  assert.ok((r.usage?.inputTokens ?? 0) > 0);
  assert.ok((r.output as { content: string }).content.length > 0);
});
