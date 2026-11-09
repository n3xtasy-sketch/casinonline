import { test } from "node:test";
import assert from "node:assert/strict";

import {
  runSectionGeneration, resolveModelConfig, requireApiKey, extractToolOutput,
  type CompleteFn, type ModelResponse, type ModelContentBlock,
} from "@/lib/ai/generate-section";
import type { ContentBrief, ContentPromptInput } from "@/lib/ai/content-prompt";
import type { GeneratedSection } from "@/lib/ai/content-output";

// ── fixtures (no real tokens; the model call is always mocked) ─────────────────
const BRIEF: ContentBrief = {
  title: "Bonus fara depunere", primaryKeyword: "bonus fara depunere", secondaryKeywords: ["rotiri gratuite"],
  intent: "informational", targetUrl: "/bonusuri/fara-depunere", h1: "Bonusuri fara depunere",
  outline: [{ level: 2, heading: "Ce este", keywords: ["bonus fara depunere"], note: "" }],
  entities: [{ name: "Netbet Casino", type: "casino", source: "confirmed", ref: "/cazinouri-online/netbet-casino" }],
  faq: [],
};
const INPUT: ContentPromptInput = {
  pageType: "bonus_category", brief: BRIEF,
  internalLinks: [{ url: "/cazinouri-online/netbet-casino", title: "Netbet" }],
  sectionId: "s0-ce-este",
};
const GOOD: GeneratedSection = {
  sectionId: "s0-ce-este", heading: "Ce este",
  content: "Un bonus fara depunere la Netbet Casino nu necesita alimentarea contului.",
  keywordsUsed: ["bonus fara depunere"], entitiesUsed: ["Netbet Casino"],
  internalLinks: ["/cazinouri-online/netbet-casino"], factualClaims: [], warnings: [],
};
const USAGE = { inputTokens: 120, outputTokens: 90 };
const resp = (over: Partial<ModelResponse>): CompleteFn => async () => ({ output: GOOD, stopReason: "tool_use", usage: USAGE, model: "claude-sonnet-5", ...over });
const throwErr = (e: unknown): CompleteFn => async () => { throw e; };

// ── config / key helpers ───────────────────────────────────────────────────────
test("requireApiKey + resolveModelConfig (defaults, overrides, retries disabled)", () => {
  assert.throws(() => requireApiKey({}), /lipsă/);
  assert.equal(requireApiKey({ ANTHROPIC_API_KEY: "key" }), "key");
  const d = resolveModelConfig({});
  assert.equal(d.model, "claude-sonnet-5");
  assert.equal(d.maxTokens, 4000); // AI-2.2: raised hard ceiling; per-section budget drives the request
  assert.equal(d.maxRetries, 0);
  assert.equal(resolveModelConfig({ AI_CONTENT_MODEL: "claude-opus-4-8" }).model, "claude-opus-4-8");
});

// ── native structured-output extraction (no JSON-from-text) ─────────────────────
test("extractToolOutput: picks the named tool_use input among multiple content blocks", () => {
  const blocks: ModelContentBlock[] = [
    { type: "text" }, // plain text block
    { type: "tool_use", name: "other", input: { nope: true } },
    { type: "tool_use", name: "emit_section", input: GOOD },
  ];
  assert.deepEqual(extractToolOutput(blocks, "emit_section"), GOOD);
  assert.equal(extractToolOutput([{ type: "text" }], "emit_section"), null); // text-only → null
  assert.equal(extractToolOutput([], "emit_section"), null);
});

// ── generation flow (mocked model) ──────────────────────────────────────────────
test("valid structured output → ok + section + usage metadata", async () => {
  const r = await runSectionGeneration(INPUT, resp({}));
  assert.equal(r.ok, true);
  assert.equal(r.section?.sectionId, "s0-ce-este");
  assert.deepEqual(r.usage, USAGE);
  assert.equal(r.model, "claude-sonnet-5");
  assert.equal(r.stopReason, "tool_use");
  assert.equal(r.errorKind, null);
});

test("plain-text response (no structured tool output) → parse_error", async () => {
  const r = await runSectionGeneration(INPUT, resp({ output: null, stopReason: "end_turn" }));
  assert.equal(r.ok, false);
  assert.equal(r.errorKind, "parse_error");
  assert.equal(r.section, null);
});

test("truncated response (max_tokens) → explicit max_tokens error, even with partial output", async () => {
  const r = await runSectionGeneration(INPUT, resp({ stopReason: "max_tokens" }));
  assert.equal(r.ok, false);
  assert.equal(r.errorKind, "max_tokens");
  assert.deepEqual(r.usage, USAGE); // usage still surfaced
});

test("structured output that fails the validator → invalid_output (strict validation kept)", async () => {
  const r = await runSectionGeneration(INPUT, resp({ output: { ...GOOD, internalLinks: ["/evil-invented"] } }));
  assert.equal(r.ok, false);
  assert.equal(r.errorKind, "invalid_output");
  assert.ok((r.validation?.errors.length ?? 0) > 0);
});

test("rate limit (429) → rate_limit, user-safe message (no internals)", async () => {
  const r = await runSectionGeneration(INPUT, throwErr({ status: 429, message: "rate_limit internal detail" }));
  assert.equal(r.errorKind, "rate_limit");
  assert.doesNotMatch(r.error ?? "", /429|internal detail/);
});

test("timeout (AbortError) → timeout; generic error → api_error (no leak)", async () => {
  assert.equal((await runSectionGeneration(INPUT, throwErr({ name: "AbortError", message: "timed out" }))).errorKind, "timeout");
  const g = await runSectionGeneration(INPUT, throwErr(new Error("secret boom stacktrace")));
  assert.equal(g.errorKind, "api_error");
  assert.doesNotMatch(g.error ?? "", /boom|stacktrace/);
});

test("invalid sectionId → no_section AND the model is NOT called (no token spend)", async () => {
  let calls = 0;
  const spy: CompleteFn = async () => { calls += 1; return { output: GOOD, stopReason: "tool_use", usage: USAGE, model: "x" }; };
  const r = await runSectionGeneration({ ...INPUT, sectionId: "nope" }, spy);
  assert.equal(r.errorKind, "no_section");
  assert.equal(calls, 0);
});

test("prompt warnings are carried through (e.g. missing verified facts)", async () => {
  const r = await runSectionGeneration(INPUT, resp({}));
  assert.ok(r.promptWarnings.some((w) => /Fara fapte verificate/.test(w)));
});

test("AI-2.2: the per-section output budget is sent to the model (not a fixed 1500)", async () => {
  let sentMaxTokens = 0;
  const capture: CompleteFn = async (req) => { sentMaxTokens = req.maxTokens; return { output: GOOD, stopReason: "tool_use", usage: USAGE, model: "claude-sonnet-5" }; };
  await runSectionGeneration(INPUT, capture); // outline section → budget > 1500
  assert.ok(sentMaxTokens > 1500, `expected budget > 1500, got ${sentMaxTokens}`);
});

test("AI-2.2: result carries cost (null in the orchestrator; the action attaches it)", async () => {
  const r = await runSectionGeneration(INPUT, resp({}));
  assert.equal(r.cost, null);
});

// ── AI-2.3: sectionId is server-controlled (stamped by the orchestrator) ─────────
test("AI-2.3: a hallucinated sectionId from the model is overwritten with the requested id", async () => {
  const r = await runSectionGeneration(INPUT, resp({ output: { ...GOOD, sectionId: "bonus-fara-depunere-cazino-intro" } }));
  assert.equal(r.ok, true); // was the real failure: mismatched sectionId → now stamped
  assert.equal(r.section?.sectionId, "s0-ce-este"); // server id, not the model's invention
});

test("AI-2.3: a missing sectionId is injected server-side; output stays valid", async () => {
  const noId: Record<string, unknown> = { ...GOOD }; // model omits sectionId entirely
  delete noId.sectionId;
  const r = await runSectionGeneration(INPUT, resp({ output: noId }));
  assert.equal(r.ok, true);
  assert.equal(r.section?.sectionId, "s0-ce-este");
});

test("AI-2.3: an unconfirmed CMS entity in entitiesUsed is still rejected (grounding not weakened)", async () => {
  const r = await runSectionGeneration(INPUT, resp({ output: { ...GOOD, entitiesUsed: ["Winner Casino"] } }));
  assert.equal(r.ok, false);
  assert.equal(r.errorKind, "invalid_output");
  assert.ok(r.validation?.errors.some((e) => /Entitate neconfirmata\/inventata/.test(e)));
});

test("AI-2.3: an SEO concept mentioned only in content (not entitiesUsed) passes", async () => {
  const seoInProse = { ...GOOD, content: "Un bonus fara depunere la Netbet Casino nu necesita alimentarea contului.", entitiesUsed: ["Netbet Casino"] };
  const r = await runSectionGeneration(INPUT, resp({ output: seoInProse }));
  assert.equal(r.ok, true);
});

// ── AI-2.4: ADVISORY editorial quality gate (style) — separate from factual validation ──
test("AI-2.4: generic marketing phrasing yields editorial warnings but does NOT fail validation", async () => {
  const generic = { ...GOOD, content: "In lumea cazinourilor online, descopera cel mai bun bonus la Netbet Casino.", entitiesUsed: ["Netbet Casino"] };
  const r = await runSectionGeneration(INPUT, resp({ output: generic }));
  assert.equal(r.ok, true); // factually grounded → valid
  assert.ok((r.editorial?.warnings.length ?? 0) > 0); // style issues surfaced separately
  assert.deepEqual(r.validation?.errors, []); // factual channel stays clean
});

test("AI-2.4: editorial report is also attached when factual validation fails (separate channels)", async () => {
  const r = await runSectionGeneration(INPUT, resp({ output: { ...GOOD, internalLinks: ["/evil-invented"], content: "In lumea cazinourilor online, descopera oferta." } }));
  assert.equal(r.errorKind, "invalid_output"); // factual error
  assert.ok(r.editorial !== null); // editorial advisory still computed
});

test("AI-2.4: editorial is null when there is no usable content (max_tokens / parse_error)", async () => {
  assert.equal((await runSectionGeneration(INPUT, resp({ stopReason: "max_tokens" }))).editorial, null);
  assert.equal((await runSectionGeneration(INPUT, resp({ output: null, stopReason: "end_turn" }))).editorial, null);
});

// ── AI-2.9B: author-knowledge observability (ids / count / estimated tokens) ──
test("AI-2.9B: result reports the scoped author-knowledge selection metadata", async () => {
  const withK = { ...INPUT, authorKnowledge: [{ id: "wagering-basis-explainer", category: "expert_explanation" as const, title: "T", content: "continut suficient de lung pentru estimare", author: "radu-bogdan-gabriel", provenance: "author_expertise" as const, status: "published" as const, applicability: { topics: ["rulaj"] } }] };
  const r = await runSectionGeneration(withK, resp({}));
  assert.deepEqual(r.knowledge?.selectedKnowledgeIds, ["wagering-basis-explainer"]);
  assert.equal(r.knowledge?.selectedKnowledgeCount, 1);
  assert.ok((r.knowledge?.estimatedKnowledgeTokens ?? 0) > 0);
});

test("AI-2.9B: no author knowledge → count 0 (no crash)", async () => {
  const r = await runSectionGeneration(INPUT, resp({}));
  assert.equal(r.knowledge?.selectedKnowledgeCount, 0);
});
