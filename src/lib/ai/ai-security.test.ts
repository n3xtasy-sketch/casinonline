import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * AI-1 security/cost guards that the pure-logic harness cannot exercise at runtime (admin gate +
 * Supabase live behind server-only + auth). Pinned at the SOURCE level so a regression (dropping the
 * admin gate, adding a CMS write, logging the key, hardcoding a key, enabling retries) fails CI.
 */
const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

test("server action is admin-gated and performs NO CMS writes (generation only)", () => {
  const a = read("src/app/admin/(panel)/seo-research/[id]/briefs/ai-actions.ts");
  assert.match(a, /requireAdmin/);
  assert.match(a, /is_admin/);
  assert.match(a, /Brief inexistent/); // nonexistent brief → safe error
  assert.doesNotMatch(a, /\.(insert|update|delete|upsert)\(/); // never writes to the CMS
});

test("orchestration is CMS-write-free and never logs the key/raw content", () => {
  const g = read("src/lib/ai/generate-section.ts");
  assert.doesNotMatch(g, /supabase|\.(insert|update|delete|upsert)\(/);
  assert.doesNotMatch(g, /console\.(log|info|warn|error)/); // no logging in the hot path
});

test("anthropic client: key from env (not hardcoded), retries disabled, timeout + token cap", () => {
  const c = read("src/lib/ai/anthropic-client.ts");
  assert.match(c, /server-only/);
  assert.match(c, /requireApiKey\(env\)/); // key from env
  assert.doesNotMatch(c, /sk-ant-/); // no hardcoded key
  assert.match(c, /maxRetries: cfg\.maxRetries/); // no uncontrolled retries (cfg = 0)
  assert.match(c, /timeout: cfg\.timeoutMs/); // request timeout
  assert.match(c, /max_tokens: Math\.min/); // output-token cap
});

test("input loader is read-only (no CMS writes)", () => {
  const i = read("src/lib/ai/brief-content-input.ts");
  assert.match(i, /server-only/);
  assert.doesNotMatch(i, /\.(insert|update|delete|upsert)\(/);
});
