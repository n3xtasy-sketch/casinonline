import { test } from "node:test";
import assert from "node:assert/strict";

import {
  categoryPath,
  isValidSelector,
  bonusMatches,
  gameMatches,
  casinoMatches,
  isValidCategorySlug,
  validateCategoryInput,
} from "@/lib/seo-categories";

test("categoryPath: short URLs, no /categorie/ segment", () => {
  assert.equal(categoryPath("bonus", "bonus-fara-depunere"), "/bonusuri/bonus-fara-depunere");
  assert.equal(categoryPath("game", "megaways"), "/pacanele-online/megaways");
  assert.equal(categoryPath("casino", "noi"), "/cazinouri-online/noi");
});

test("isValidSelector: whitelist per namespace", () => {
  assert.ok(isValidSelector("bonus", "bonus:no_deposit"));
  assert.ok(isValidSelector("bonus", "bonus:no_deposit+free_spins"));
  assert.ok(isValidSelector("bonus", "bonus:no_wagering"));
  assert.ok(isValidSelector("bonus", "bonus:type=cashback"));
  assert.ok(isValidSelector("game", "game:category=megaways"));
  assert.ok(isValidSelector("game", "game:gratis"));
  assert.ok(isValidSelector("casino", "casino:tag=nou"));
  assert.ok(isValidSelector("casino", "casino:license_onjn"));
  // wrong namespace / unknown kind / cross-namespace
  assert.ok(!isValidSelector("bonus", "game:gratis"));
  assert.ok(!isValidSelector("bonus", "bonus:unknown"));
  assert.ok(!isValidSelector("game", "game:license_onjn"));
  assert.ok(!isValidSelector("casino", "casino:tag="));
});

test("bonusMatches: the free-spins / no-deposit OVERLAP (one offer, many categories)", () => {
  // "277 rotiri gratuite fără depunere": free spins AND no-deposit.
  const fsNoDep = { typeSlug: "rotiri-gratuite", freeSpins: 277, isNoDeposit: true };
  assert.ok(bonusMatches("bonus:no_deposit", fsNoDep)); // appears under /bonusuri/bonus-fara-depunere
  assert.ok(bonusMatches("bonus:no_deposit+free_spins", fsNoDep)); // AND /bonusuri/rotiri-gratuite-fara-depunere
  // a no-deposit cash offer (no free spins) is NOT in the free-spins overlap category
  const noDepCash = { typeSlug: "fara-depunere", freeSpins: 0, isNoDeposit: true };
  assert.ok(bonusMatches("bonus:no_deposit", noDepCash));
  assert.ok(!bonusMatches("bonus:no_deposit+free_spins", noDepCash));
  // free spins but WITH deposit → not in no-deposit categories
  const fsWithDep = { typeSlug: "rotiri-gratuite", freeSpins: 200, isNoDeposit: false };
  assert.ok(!bonusMatches("bonus:no_deposit", fsWithDep));
  assert.ok(!bonusMatches("bonus:no_deposit+free_spins", fsWithDep));
});

test("bonusMatches: no_wagering is flag-driven (not derived)", () => {
  assert.ok(bonusMatches("bonus:no_wagering", { typeSlug: "fara-rulaj", isNoWagering: true }));
  assert.ok(!bonusMatches("bonus:no_wagering", { typeSlug: "bonus-de-bun-venit", isNoWagering: false }));
});

test("bonusMatches: type= selector", () => {
  assert.ok(bonusMatches("bonus:type=cashback", { typeSlug: "cashback" }));
  assert.ok(!bonusMatches("bonus:type=cashback", { typeSlug: "rotiri-gratuite" }));
});

test("gameMatches: category + gratis (allowlist default-deny)", () => {
  assert.ok(gameMatches("game:category=megaways", { categorySlug: "megaways" }));
  assert.ok(!gameMatches("game:category=megaways", { categorySlug: "jackpot" }));
  // gratis: empty allowlist → no https host vetted yet → false even with a URL
  assert.ok(!gameMatches("game:gratis", { categorySlug: "sloturi", demoUrl: "https://demo.example.com/x" }));
  assert.ok(!gameMatches("game:gratis", { categorySlug: "sloturi", demoUrl: null }));
  assert.ok(!gameMatches("game:gratis", { categorySlug: "sloturi", demoUrl: "http://insecure/x" }));
});

test("casinoMatches: tag + verifiable ONJN license", () => {
  assert.ok(casinoMatches("casino:tag=nou", { tags: ["nou", "popular"] }));
  assert.ok(!casinoMatches("casino:tag=nou", { tags: ["popular"] }));
  // ONJN only when license mentions ONJN AND is verified (no generic guessing)
  assert.ok(casinoMatches("casino:license_onjn", { license: "ONJN L1160364W000853", licenseVerifiedAt: "2026-01-01" }));
  assert.ok(!casinoMatches("casino:license_onjn", { license: "ONJN ...", licenseVerifiedAt: null }));
  assert.ok(!casinoMatches("casino:license_onjn", { license: null, licenseVerifiedAt: "2026-01-01" }));
});

test("isValidCategorySlug", () => {
  assert.ok(isValidCategorySlug("bonus-fara-depunere"));
  assert.ok(!isValidCategorySlug("Bonus Fara"));
  assert.ok(!isValidCategorySlug("-bad"));
  assert.ok(!isValidCategorySlug(""));
});

test("validateCategoryInput", () => {
  assert.equal(validateCategoryInput({ namespace: "bonus", slug: "bonus-fara-depunere", name: "Bonus fără depunere", selector: "bonus:no_deposit", status: "draft" }), null);
  assert.match(validateCategoryInput({ namespace: "x", slug: "a", name: "A", selector: "x:y" })!, /Namespace/);
  assert.match(validateCategoryInput({ namespace: "bonus", slug: "BAD SLUG", name: "A", selector: "bonus:no_deposit" })!, /Slug/);
  assert.match(validateCategoryInput({ namespace: "bonus", slug: "ok", name: "A", selector: "game:gratis" })!, /Selector/);
  assert.match(validateCategoryInput({ namespace: "game", slug: "ok", name: "", selector: "game:gratis" })!, /Numele/);
});
