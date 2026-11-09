import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldShowDetailsLink, normalizePath } from "@/components/bonuses/bonus-card-cta";

test("shouldShowDetailsLink: shown when no current path (hub/homepage/similar)", () => {
  assert.equal(shouldShowDetailsLink("/bonusuri/bonus-de-bun-venit"), true);
  assert.equal(shouldShowDetailsLink("/cazinouri-online/betano-casino/bonus-de-bun-venit"), true);
});

test("shouldShowDetailsLink: shown when SEO destination differs from the current page", () => {
  assert.equal(shouldShowDetailsLink("/bonusuri/rotiri-gratuite", "/bonusuri/bonus-de-bun-venit"), true);
});

test("shouldShowDetailsLink: HIDDEN when SEO destination equals the current page (self-link)", () => {
  assert.equal(shouldShowDetailsLink("/bonusuri/bonus-de-bun-venit", "/bonusuri/bonus-de-bun-venit"), false);
});

test("normalizePath: trailing slash, query and hash are ignored", () => {
  assert.equal(normalizePath("/bonusuri/rotiri-gratuite/"), "/bonusuri/rotiri-gratuite");
  assert.equal(normalizePath("/bonusuri/rotiri-gratuite?tip=x"), "/bonusuri/rotiri-gratuite");
  assert.equal(normalizePath("/bonusuri/rotiri-gratuite#top"), "/bonusuri/rotiri-gratuite");
  assert.equal(normalizePath("/"), "/"); // root keeps its slash
});

test("shouldShowDetailsLink: self-link detected despite trailing slash / query / hash (not fragile)", () => {
  assert.equal(shouldShowDetailsLink("/bonusuri/cashback", "/bonusuri/cashback/"), false);
  assert.equal(shouldShowDetailsLink("/bonusuri/cashback", "/bonusuri/cashback?sort=nou"), false);
  assert.equal(shouldShowDetailsLink("/bonusuri/cashback", "/bonusuri/cashback#lista"), false);
  // genuinely different paths still show the link
  assert.equal(shouldShowDetailsLink("/bonusuri/fara-depunere", "/bonusuri/cashback"), true);
});
