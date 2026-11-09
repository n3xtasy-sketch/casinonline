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

test("BonusCard: title links to seoHref but becomes plain text on self-link; CTAs correct", () => {
  const src = read("src/components/bonuses/BonusCard.tsx");
  // title is conditional: <Link href={seoHref}> when showDetails, else a plain <span>
  assert.match(src, /showDetails \?[\s\S]*?<Link href=\{seoHref\}[\s\S]*?:\s*\(\s*<span/);
  assert.match(src, /<Button href=\{claimUrl\}[\s\S]*?Revendică bonusul/); // primary affiliate CTA
  assert.match(src, /variant="secondary" href=\{seoHref\}[\s\S]*?Detalii bonus/); // secondary SEO link
  assert.match(src, /shouldShowDetailsLink/); // self-link suppression wired
});

test("RightSidebar: SEO nav (seoHref) + affiliate access (claimUrl) both present", () => {
  const src = read("src/components/layout/RightSidebar.tsx");
  assert.match(src, /href=\{bonus\.claimUrl\}[\s\S]*?Revendică bonusul/); // affiliate
  assert.match(src, /href=\{bonus\.seoHref\}[\s\S]*?Detalii bonus/); // SEO nav
});

test("CategoryPage passes currentPath to BonusCard (enables self-link suppression)", () => {
  const src = read("src/components/seo/CategoryPage.tsx");
  assert.match(src, /currentPath=\{currentPath\}/);
  assert.match(src, /const currentPath = categoryPath\(/);
});

test("Destination pages keep 'Revendică bonusul' on claimUrl (not changed by URL-2.3)", () => {
  assert.match(read("src/components/bonuses/BonusDetailHeader.tsx"), /href=\{claimUrl\}>Revendică bonusul/);
  assert.match(read("src/components/seo/EvergreenBonusPage.tsx"), /href=\{featured\.claimUrl\}>Revendică bonusul/);
});
