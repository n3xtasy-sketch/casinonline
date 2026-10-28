import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeKeyword, validateProjectInput } from "@/lib/seo-research";

// normalizeKeyword is a DEDUP key only (not a semantic signal).
test("normalizeKeyword: lowercase + trim + collapse spaces", () => {
  assert.equal(normalizeKeyword("  Bonus   Fara Depunere  "), "bonus fara depunere");
});

test("normalizeKeyword: strips Romanian diacritics", () => {
  assert.equal(normalizeKeyword("păcănele câștig întârziat șansă țeapă"), "pacanele castig intarziat sansa teapa");
  assert.equal(normalizeKeyword("ROTIRI GRATUITE FĂRĂ DEPUNERE"), "rotiri gratuite fara depunere");
});

test("normalizeKeyword: diacritic + case variants collapse to the same dedup key", () => {
  assert.equal(normalizeKeyword("Câștig Întârziat"), normalizeKeyword("castig intarziat"));
  assert.equal(normalizeKeyword("Bonus FĂRĂ Depunere"), normalizeKeyword("bonus fara depunere"));
});

test("validateProjectInput: name required", () => {
  assert.ok(validateProjectInput({ name: "   " }));
  assert.equal(validateProjectInput({ name: "Research RO", defaultCountry: "ro" }), null);
});

test("validateProjectInput: country must be 2 letters when provided", () => {
  assert.ok(validateProjectInput({ name: "X", defaultCountry: "romania" }));
  assert.equal(validateProjectInput({ name: "X", defaultCountry: "RO" }), null);
  assert.equal(validateProjectInput({ name: "X" }), null); // optional
});

test("validateProjectInput: rejects overly long name", () => {
  assert.ok(validateProjectInput({ name: "x".repeat(121) }));
});
