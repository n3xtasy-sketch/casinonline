import { test } from "node:test";
import assert from "node:assert/strict";
import { acquireABRun, releaseABRun, isABRunInFlight } from "@/lib/ai/ab-run-guard";

test("acquire returns true once, false for a duplicate while in flight (double-click protection)", () => {
  const key = "proj-1:brief-1";
  assert.equal(isABRunInFlight(key), false);
  assert.equal(acquireABRun(key), true);   // first acquire wins
  assert.equal(isABRunInFlight(key), true);
  assert.equal(acquireABRun(key), false);  // duplicate rejected
  releaseABRun(key);
  assert.equal(isABRunInFlight(key), false);
  assert.equal(acquireABRun(key), true);   // released → can run again
  releaseABRun(key);
});

test("keys are independent (different briefs can run concurrently)", () => {
  assert.equal(acquireABRun("p:a"), true);
  assert.equal(acquireABRun("p:b"), true); // different key not blocked
  assert.equal(acquireABRun("p:a"), false);
  releaseABRun("p:a");
  releaseABRun("p:b");
});
