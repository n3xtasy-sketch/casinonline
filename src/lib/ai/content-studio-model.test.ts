import { test } from "node:test";
import assert from "node:assert/strict";
import {
  errorLabel, isDirty, needsRegenerateConfirm,
  claimGroupOf, verdictLabel, factualReviewRows, rowsInGroup, nonClaimMessages,
} from "@/lib/ai/content-studio-model";
import type { GenerationErrorKind } from "@/lib/ai/generate-section";
import type { ClaimCheck } from "@/lib/ai/fact-verification";

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

// ── AI-2.7.1 Factual Review UI model ────────────────────────────────────────────
test("claimGroupOf: supported→supported, unverifiable→review, the 3 errors→blocked", () => {
  assert.equal(claimGroupOf("supported"), "supported");
  assert.equal(claimGroupOf("unverifiable"), "review");
  assert.equal(claimGroupOf("invented"), "blocked");
  assert.equal(claimGroupOf("contradictory"), "blocked");
  assert.equal(claimGroupOf("expired"), "blocked");
});

test("verdictLabel: every verdict has a clear RO label (no diacritics); nothing unverified reads as verified", () => {
  for (const v of ["supported", "unverifiable", "invented", "contradictory", "expired"] as const) {
    assert.ok(verdictLabel(v).length > 0);
    assert.doesNotMatch(verdictLabel(v), /[ăâîșțĂÂÎȘȚ]/);
  }
  assert.match(verdictLabel("supported"), /verificata/); // supported = CMS-verified
  assert.match(verdictLabel("unverifiable"), /verificare editoriala/);
});

const checks: ClaimCheck[] = [
  { claim: "rulaj 30x", verdict: "supported" },
  { claim: "rulaj 50x", verdict: "contradictory", reason: "contrazice fapta" },
  { claim: "oferta", verdict: "unverifiable", reason: "fara sursa" },
  { claim: "sursa falsa", verdict: "invented" },
];
const claims = [
  { claim: "rulaj 30x", sourceRef: "bonuses.wagering_multiplier" },
  { claim: "rulaj 50x", sourceRef: "bonuses.wagering_multiplier" },
  { claim: "oferta", sourceRef: null },
  { claim: "sursa falsa", sourceRef: "https://fake.example" },
];

test("factualReviewRows: pairs each check with its sourceRef (by order) + carries verdict/reason/group", () => {
  const rows = factualReviewRows(claims, checks);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].sourceRef, "bonuses.wagering_multiplier");
  assert.equal(rows[0].group, "supported");
  assert.equal(rows[2].sourceRef, null); // fara sursa preserved, not invented
  assert.equal(rows[2].reason, "fara sursa");
  assert.equal(rows[3].group, "blocked");
});

test("factualReviewRows: zero claimChecks → empty rows (no crash, no fabricated rows)", () => {
  assert.deepEqual(factualReviewRows([], []), []);
  assert.deepEqual(factualReviewRows(undefined, undefined), []);
});

test("rowsInGroup: splits rows into the three buckets", () => {
  const rows = factualReviewRows(claims, checks);
  assert.deepEqual(rowsInGroup(rows, "blocked").map((r) => r.verdict).sort(), ["contradictory", "invented"]);
  assert.deepEqual(rowsInGroup(rows, "review").map((r) => r.verdict), ["unverifiable"]);
  assert.deepEqual(rowsInGroup(rows, "supported").map((r) => r.verdict), ["supported"]);
});

test("nonClaimMessages: drops per-claim validator lines (dedupe) but keeps other warnings/errors", () => {
  const warnings = [
    "Afirmatie factuala de verificat editorial: x - fara sursa.",
    "Posibil keyword stuffing: bonus.",
    "Cifra/procent/licenta mentionata fara nicio factualClaim cu sursa - verifica.",
  ];
  const kept = nonClaimMessages(warnings);
  assert.equal(kept.length, 2);
  assert.ok(!kept.some((w) => /Afirmatie factuala/.test(w)));
  // the personal-experience ERROR ("Afirmatie de ...") must NOT be filtered (different prefix)
  assert.deepEqual(nonClaimMessages(["Afirmatie de experienta personala (interzis)."]), ["Afirmatie de experienta personala (interzis)."]);
  assert.deepEqual(nonClaimMessages(undefined), []);
});
