import { test } from "node:test";
import assert from "node:assert/strict";

import { casinoReviewSlug, resolveNewCasinoSlug } from "@/lib/seo/casino-slug";

test("appends -casino when the name lacks the vertical word", () => {
  assert.equal(casinoReviewSlug("Superbet"), "superbet-casino");
  assert.equal(casinoReviewSlug("Betano"), "betano-casino");
  assert.equal(casinoReviewSlug("NetBet"), "netbet-casino");
  assert.equal(casinoReviewSlug("Mr Bit"), "mr-bit-casino");
  assert.equal(casinoReviewSlug("Winmasters"), "winmasters-casino");
});

test("keeps the natural form when the name already contains casino/cazino", () => {
  assert.equal(casinoReviewSlug("Vlad Cazino"), "vlad-cazino");
  assert.equal(casinoReviewSlug("888casino"), "888casino");
  assert.equal(casinoReviewSlug("Casino Royale"), "casino-royale");
});

test("is idempotent on already-conformant slugs/names", () => {
  assert.equal(casinoReviewSlug("betano-casino"), "betano-casino");
  assert.equal(casinoReviewSlug("Betano Casino"), "betano-casino");
  assert.equal(casinoReviewSlug("vlad-cazino"), "vlad-cazino");
});

test("strips RO diacritics like the site slugify", () => {
  assert.equal(casinoReviewSlug("Țară Bet"), "tara-bet-casino");
});

// ── create-flow slug resolution (mirrors createCasino) ────────────────────────
test("create flow: derives -casino slug from name when no manual slug is given", () => {
  assert.equal(resolveNewCasinoSlug("", "Betano"), "betano-casino");
  assert.equal(resolveNewCasinoSlug("", "Superbet"), "superbet-casino");
  assert.equal(resolveNewCasinoSlug("   ", "NetBet"), "netbet-casino");
});

test("create flow: never doubles casino/cazino for the derived slug", () => {
  assert.equal(resolveNewCasinoSlug("", "Vlad Cazino"), "vlad-cazino");
  assert.equal(resolveNewCasinoSlug("", "888casino"), "888casino");
});

test("create flow: a manual override wins and is normalized", () => {
  assert.equal(resolveNewCasinoSlug("custom-brand", "Betano"), "custom-brand");
  assert.equal(resolveNewCasinoSlug("  SuperBet-Casino ", "Ignored"), "superbet-casino");
});
