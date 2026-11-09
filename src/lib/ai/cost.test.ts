import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateCost, resolveRates } from "@/lib/ai/cost";

test("estimateCost: computes from usage + configured rates", () => {
  const c = estimateCost({ inputTokens: 9548, outputTokens: 1500 }, { inputPerMillion: 3, outputPerMillion: 15 });
  assert.ok(c);
  assert.ok(Math.abs(c.input - (9548 / 1_000_000) * 3) < 1e-9);
  assert.ok(Math.abs(c.output - (1500 / 1_000_000) * 15) < 1e-9);
  assert.ok(Math.abs(c.total - (c.input + c.output)) < 1e-9);
  assert.equal(c.currency, "USD");
});

test("estimateCost: null when rates OR usage are missing (no guessed price)", () => {
  assert.equal(estimateCost({ inputTokens: 100, outputTokens: 50 }, null), null);
  assert.equal(estimateCost(null, { inputPerMillion: 3, outputPerMillion: 15 }), null);
});

test("resolveRates: from env JSON map; null when unset / unknown model / bad JSON", () => {
  const env = { AI_CONTENT_RATES: JSON.stringify({ "claude-sonnet-5": { inputPerMillion: 3, outputPerMillion: 15 } }) };
  assert.deepEqual(resolveRates("claude-sonnet-5", env), { inputPerMillion: 3, outputPerMillion: 15 });
  assert.equal(resolveRates("claude-opus-4-8", env), null); // not configured
  assert.equal(resolveRates("claude-sonnet-5", {}), null); // no env config
  assert.equal(resolveRates(null, env), null);
  assert.equal(resolveRates("claude-sonnet-5", { AI_CONTENT_RATES: "{not json" }), null);
});
