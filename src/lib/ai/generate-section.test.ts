import { test } from "node:test";
import assert from "node:assert/strict";

import {
  runSectionGeneration, resolveModelConfig, requireApiKey,
  type CompleteFn,
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
const retText = (s: string): CompleteFn => async () => s;
const throwErr = (e: unknown): CompleteFn => async () => { throw e; };

// ── config / key helpers ───────────────────────────────────────────────────────
test("requireApiKey: throws when absent, returns when present", () => {
  assert.throws(() => requireApiKey({}), /ANTHROPIC_API_KEY lipsă/);
  assert.throws(() => requireApiKey({ ANTHROPIC_API_KEY: "  " }), /lipsă/);
  assert.equal(requireApiKey({ ANTHROPIC_API_KEY: "key" }), "key");
});
test("resolveModelConfig: defaults + env overrides; retries disabled", () => {
  const d = resolveModelConfig({});
  assert.equal(d.model, "claude-sonnet-5");
  assert.equal(d.maxTokens, 1500);
  assert.equal(d.timeoutMs, 30000);
  assert.equal(d.maxRetries, 0);
  const o = resolveModelConfig({ AI_CONTENT_MODEL: "claude-opus-4-8", AI_CONTENT_MAX_TOKENS: "800", AI_CONTENT_TIMEOUT_MS: "5000" });
  assert.equal(o.model, "claude-opus-4-8");
  assert.equal(o.maxTokens, 800);
  assert.equal(o.timeoutMs, 5000);
});

// ── generation flow (mocked model) ──────────────────────────────────────────────
test("valid model response → ok + parsed section (tolerates code fences/prose)", async () => {
  const r = await runSectionGeneration(INPUT, retText("Iata:\n```json\n" + JSON.stringify(GOOD) + "\n```"));
  assert.equal(r.ok, true);
  assert.equal(r.section?.sectionId, "s0-ce-este");
  assert.equal(r.errorKind, null);
});

test("invalid JSON → parse_error", async () => {
  const r = await runSectionGeneration(INPUT, retText("Imi pare rau, nu pot."));
  assert.equal(r.ok, false);
  assert.equal(r.errorKind, "parse_error");
  assert.equal(r.section, null);
});

test("output rejected by validator → invalid_output + errors (not a hard crash)", async () => {
  const bad = { ...GOOD, internalLinks: ["/evil-invented"] };
  const r = await runSectionGeneration(INPUT, retText(JSON.stringify(bad)));
  assert.equal(r.ok, false);
  assert.equal(r.errorKind, "invalid_output");
  assert.ok((r.validation?.errors.length ?? 0) > 0);
});

test("rate limit (429) → rate_limit, user-safe message (no internals)", async () => {
  const r = await runSectionGeneration(INPUT, throwErr({ status: 429, message: "rate_limit_error internal detail" }));
  assert.equal(r.errorKind, "rate_limit");
  assert.doesNotMatch(r.error ?? "", /429|internal detail/);
});

test("timeout (AbortError) → timeout", async () => {
  const r = await runSectionGeneration(INPUT, throwErr({ name: "AbortError", message: "request timed out" }));
  assert.equal(r.errorKind, "timeout");
});

test("generic API error → api_error, internal message not leaked", async () => {
  const r = await runSectionGeneration(INPUT, throwErr(new Error("secret stacktrace boom")));
  assert.equal(r.errorKind, "api_error");
  assert.doesNotMatch(r.error ?? "", /boom|stacktrace/);
});

test("invalid sectionId → no_section AND the model is NOT called (no token spend)", async () => {
  let calls = 0;
  const spy: CompleteFn = async () => { calls += 1; return JSON.stringify(GOOD); };
  const r = await runSectionGeneration({ ...INPUT, sectionId: "nope" }, spy);
  assert.equal(r.errorKind, "no_section");
  assert.equal(calls, 0);
});

test("result carries prompt warnings (e.g. missing verified facts) without failing", async () => {
  const r = await runSectionGeneration(INPUT, retText(JSON.stringify(GOOD)));
  assert.ok(Array.isArray(r.promptWarnings));
  assert.ok(r.promptWarnings.some((w) => /Fara fapte verificate/.test(w))); // no cmsRelations in INPUT
});
