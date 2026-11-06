import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * URL-2.3 regression guard. There is no component-render harness (the test runner is
 * `tsx --test src/**\/*.test.ts`, pure logic only), so the bonus-card link wiring is pinned at the
 * SOURCE level: the card + sidebar "Vezi oferta" must navigate to the resolved SEO destination
 * (seoHref), NOT the affiliate claimUrl; the destination pages keep the affiliate "Revendică
 * bonusul" CTA on claimUrl. Classification (welcome+FS, no-deposit+FS) is covered in
 * offer-destination.test.ts.
 */
const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

test("BonusCard: title AND 'Vezi oferta' navigate to seoHref, never claimUrl", () => {
  const src = read("src/components/bonuses/BonusCard.tsx");
  assert.match(src, /<Link href=\{seoHref\}/); // title → seoHref
  assert.match(src, /<Button href=\{seoHref\}[\s\S]*?Vezi oferta/); // CTA → seoHref
  assert.doesNotMatch(src, /href=\{claimUrl\}/); // no affiliate navigation from the card
});

test("RightSidebar: 'Vezi oferta' navigates to bonus.seoHref, not bonus.claimUrl", () => {
  const src = read("src/components/layout/RightSidebar.tsx");
  assert.match(src, /href=\{bonus\.seoHref\}[\s\S]*?Vezi oferta/);
  assert.doesNotMatch(src, /href=\{bonus\.claimUrl\}/);
});

test("Destination pages keep 'Revendică bonusul' on claimUrl (not changed by URL-2.3)", () => {
  assert.match(read("src/components/bonuses/BonusDetailHeader.tsx"), /href=\{claimUrl\}>Revendică bonusul/);
  assert.match(read("src/components/seo/EvergreenBonusPage.tsx"), /href=\{featured\.claimUrl\}>Revendică bonusul/);
});
