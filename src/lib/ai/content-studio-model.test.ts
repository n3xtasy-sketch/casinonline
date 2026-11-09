import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLabel, isDirty, needsRegenerateConfirm } from "@/lib/ai/content-studio-model";
import type { GenerationErrorKind } from "@/lib/ai/generate-section";

test("errorLabel: every error kind maps to a clear label + tone", () => {
  const kinds: GenerationErrorKind[] = ["no_section", "parse_error", "invalid_output", "max_tokens", "rate_limit", "timeout", "api_error"];
  for (const k of kinds) {
    const l = errorLabel(k);
    assert.ok(l.label.length > 0);
    assert.ok(l.tone === "warn" || l.tone === "error");
  }
  assert.equal(errorLabel("api_error").label, "Eroare provider / configurare");
  assert.equal(errorLabel("max_tokens").tone, "warn");
  assert.equal(errorLabel("rate_limit").tone, "warn");
  assert.equal(errorLabel("invalid_output").tone, "error");
});

test("isDirty: true only when edited content differs from the applied baseline", () => {
  assert.equal(isDirty("abc", "abc"), false);
  assert.equal(isDirty("abc x", "abc"), true);
});

test("needsRegenerateConfirm: confirm only with a result AND unsaved edits", () => {
  assert.equal(needsRegenerateConfirm("edited", "base", true), true); // dirty + has result → confirm
  assert.equal(needsRegenerateConfirm("same", "same", true), false); // no edits → no confirm
  assert.equal(needsRegenerateConfirm("edited", "base", false), false); // no result yet → no confirm
});
