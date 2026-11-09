import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EVERGREEN_INTENT_SLUGS,
  isValidIntent,
  intentLabel,
  intentSelector,
  evergreenBonusMatches,
} from "@/lib/evergreen-bonus";

test("registry: known intents only (URL-1.1 aligned taxonomy)", () => {
  assert.deepEqual(EVERGREEN_INTENT_SLUGS.sort(), [
    "bonus-cashback", "bonus-de-bun-venit", "bonus-fara-depunere", "bonus-fara-rulaj", "rotiri-gratuite",
  ]);
  assert.ok(isValidIntent("bonus-fara-depunere"));
  assert.ok(isValidIntent("rotiri-gratuite"));
  assert.ok(!isValidIntent("rotiri-gratuite-fara-depunere")); // legacy intent dropped (decision 7)
  assert.ok(!isValidIntent("bonus-inexistent"));
  assert.ok(!isValidIntent(""));
  assert.equal(intentLabel("bonus-de-bun-venit"), "Bonus de bun venit");
  assert.equal(intentLabel("rotiri-gratuite"), "Rotiri gratuite");
  assert.equal(intentSelector("rotiri-gratuite"), "bonus:free_spins_deposit");
  assert.equal(intentSelector("bonus-fara-rulaj"), "bonus:no_wagering");
  assert.equal(intentSelector("inexistent"), null);
});

test("evergreenBonusMatches: no-deposit free spins collapse to bonus-fara-depunere, NOT rotiri-gratuite", () => {
  // Betano 277 free spins no-deposit → bonus-fara-depunere only (rotiri-gratuite = DEPOSIT free spins).
  const fsNoDep = { typeSlug: "rotiri-gratuite", freeSpins: 277, isNoDeposit: true };
  assert.ok(evergreenBonusMatches("bonus-fara-depunere", fsNoDep));
  assert.ok(!evergreenBonusMatches("rotiri-gratuite", fsNoDep));
  // DEPOSIT free spins → rotiri-gratuite only (not bonus-fara-depunere).
  const fsDep = { typeSlug: "rotiri-gratuite", freeSpins: 100, isNoDeposit: false };
  assert.ok(evergreenBonusMatches("rotiri-gratuite", fsDep));
  assert.ok(!evergreenBonusMatches("bonus-fara-depunere", fsDep));
  // No-deposit cash (no free spins): only bonus-fara-depunere.
  const cashNoDep = { typeSlug: "fara-depunere", freeSpins: 0, isNoDeposit: true };
  assert.ok(evergreenBonusMatches("bonus-fara-depunere", cashNoDep));
  assert.ok(!evergreenBonusMatches("rotiri-gratuite", cashNoDep));
});

test("evergreenBonusMatches: no-wagering flag + type intents", () => {
  assert.ok(evergreenBonusMatches("bonus-fara-rulaj", { typeSlug: "fara-rulaj", isNoWagering: true }));
  assert.ok(!evergreenBonusMatches("bonus-fara-rulaj", { typeSlug: "bonus-de-bun-venit", isNoWagering: false }));
  assert.ok(evergreenBonusMatches("bonus-de-bun-venit", { typeSlug: "bonus-de-bun-venit" }));
  assert.ok(evergreenBonusMatches("bonus-cashback", { typeSlug: "cashback" }));
  assert.ok(!evergreenBonusMatches("bonus-cashback", { typeSlug: "rotiri-gratuite" }));
});

test("evergreenBonusMatches: unknown intent never matches", () => {
  assert.ok(!evergreenBonusMatches("inexistent", { typeSlug: "cashback" }));
});
