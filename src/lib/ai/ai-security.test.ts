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

test("orchestration is CMS-write-free, no logging, native structured output (no fragile extraction)", () => {
  const g = read("src/lib/ai/generate-section.ts");
  assert.doesNotMatch(g, /supabase|\.(insert|update|delete|upsert)\(/);
  assert.doesNotMatch(g, /console\.(log|info|warn|error)/); // no logging in the hot path
  assert.doesNotMatch(g, /indexOf\("\{"\)|lastIndexOf\("\}"\)/); // AI-2.1: fragile brace extraction removed
  assert.match(g, /stopReason === "max_tokens"/); // explicit truncation detection
});

test("anthropic client: NATIVE structured output (forced tool use), key from env, retries off, caps", () => {
  const c = read("src/lib/ai/anthropic-client.ts");
  assert.match(c, /server-only/);
  assert.match(c, /tools:\s*\[SECTION_TOOL\]/); // native structured output
  assert.match(c, /tool_choice:\s*\{\s*type:\s*"tool"/); // forced tool call
  assert.match(c, /input_schema/); // schema mirroring GeneratedSection
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

test("AI-2.9D.2E AB action: admin-gated server-side, ids-only, server LIVE token, rulaj-only, no CMS writes", () => {
  const a = read("src/app/admin/(panel)/content-studio/ab-actions.ts");
  assert.match(a, /"use server"/);
  assert.match(a, /requireAdmin\(\)/); // authorization re-checked on every call
  assert.match(a, /is_admin/);
  // signature accepts ONLY ids — no prompt/model/authorKnowledge/token/specs from the client
  assert.match(a, /runRulajABExperimentAction\(projectId: string, briefId: string\)/);
  // LIVE token stays server-side (imported, never a parameter)
  assert.match(a, /authorize: LIVE_AUTH_TOKEN/);
  assert.match(a, /import \{[^}]*LIVE_AUTH_TOKEN[^}]*\} from "@\/lib\/ai\/ab-runner"/);
  // only the rulaj pair, and the in-flight guard
  assert.match(a, /buildVirtualSectionInputs\(base\)\.slice\(0, 1\)/);
  assert.match(a, /acquireABRun\(key\)/);
  assert.match(a, /releaseABRun\(key\)/);
  // no CMS writes, no key in the response
  assert.doesNotMatch(a, /\.(insert|update|delete|upsert)\(/);
  assert.doesNotMatch(a, /sk-ant|apiKey/);
});

test("AI-2.9D.2E AB UI: passes ids only, confirms, disables on pending (double-click), no secrets", () => {
  const c = read("src/components/admin/ContentStudio.tsx");
  assert.match(c, /runRulajABExperimentAction\(projectId, briefId\)/); // only ids
  assert.match(c, /window\.confirm\(/); // explicit confirmation
  assert.match(c, /disabled=\{abPending/); // button disabled while running
  assert.doesNotMatch(c, /LIVE_AUTH_TOKEN|createAnthropicComplete|sk-ant|apiKey/); // no server-only secrets in the client
});
