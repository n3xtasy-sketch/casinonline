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
  assert.equal(d.maxTokens, 1500);
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
