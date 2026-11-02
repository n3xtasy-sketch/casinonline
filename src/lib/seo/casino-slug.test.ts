import { test } from "node:test";
import assert from "node:assert/strict";

import { casinoReviewSlug } from "@/lib/seo/casino-slug";

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
