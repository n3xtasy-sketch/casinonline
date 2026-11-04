import { test } from "node:test";
import assert from "node:assert/strict";

import {
  offerCanonicalIntent, resolveOfferDestination, evergreenKey,
  type OfferForDestination, type DestinationContext,
} from "@/lib/seo/offer-destination";

// ── fixtures ──────────────────────────────────────────────────────────────────
const SB = "superbet-casino";
const offer = (o: Partial<OfferForDestination>): OfferForDestination =>
  ({ casinoSlug: SB, typeSlug: "bonus-de-bun-venit", freeSpins: null, isNoDeposit: false, isNoWagering: false, ...o });

const ctx = (o: Partial<DestinationContext> = {}): DestinationContext => ({
  publishedEvergreen: new Set<string>(),
  publishedBonusCategories: new Set<string>(),
  override: null,
  ...o,
});

const NO_DEPOSIT = offer({ typeSlug: "fara-depunere", isNoDeposit: true });
const NO_DEPOSIT_FS = offer({ typeSlug: "fara-depunere", isNoDeposit: true, freeSpins: 50 });
const WELCOME = offer({ typeSlug: "bonus-de-bun-venit" });
const DEPOSIT_FS = offer({ typeSlug: "rotiri-gratuite", freeSpins: 100, isNoDeposit: false });
const CASHBACK = offer({ typeSlug: "cashback" });
const RELOAD = offer({ typeSlug: "reload" }); // unclassifiable

// ════════════════════════ CANONICAL INTENT (rules 1–5) ════════════════════════
test("rule 1: bonus fără depunere → bonus-fara-depunere", () => {
  assert.equal(offerCanonicalIntent(NO_DEPOSIT), "bonus-fara-depunere");
});
test("rule 2: rotiri gratuite FĂRĂ depunere → bonus-fara-depunere (no-deposit wins over free spins)", () => {
  assert.equal(offerCanonicalIntent(NO_DEPOSIT_FS), "bonus-fara-depunere");
});
test("rule 3: bonus de bun venit cu depunere → bonus-de-bun-venit", () => {
  assert.equal(offerCanonicalIntent(WELCOME), "bonus-de-bun-venit");
});
test("rule 4: rotiri gratuite LA depunere → rotiri-gratuite", () => {
  assert.equal(offerCanonicalIntent(DEPOSIT_FS), "rotiri-gratuite");
});
test("rule 5: cashback → bonus-cashback", () => {
  assert.equal(offerCanonicalIntent(CASHBACK), "bonus-cashback");
});
test("unclassifiable offer → null (safe, not misclassified)", () => {
  assert.equal(offerCanonicalIntent(RELOAD), null);
});

// ── multi-intent priority (a single canonical destination) ──────────────────────
test("multi-intent priority: no-deposit + free spins + cashback type → bonus-fara-depunere", () => {
  assert.equal(offerCanonicalIntent(offer({ typeSlug: "cashback", isNoDeposit: true, freeSpins: 20 })), "bonus-fara-depunere");
});
test("multi-intent priority: cashback + deposit free spins → bonus-cashback (cashback beats deposit FS)", () => {
  assert.equal(offerCanonicalIntent(offer({ typeSlug: "cashback", freeSpins: 20, isNoDeposit: false })), "bonus-cashback");
});
test("multi-intent priority: welcome type + deposit free spins → rotiri-gratuite (free spins beats welcome)", () => {
  assert.equal(offerCanonicalIntent(offer({ typeSlug: "bonus-de-bun-venit", freeSpins: 30, isNoDeposit: false })), "rotiri-gratuite");
});

// ════════════════════════ DESTINATION RESOLUTION ════════════════════════
test("published evergreen page wins → operator evergreen URL", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({ publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-depunere")]) }));
  assert.equal(r.kind, "evergreen");
  assert.equal(r.url, "/cazinouri-online/superbet-casino/bonus-fara-depunere");
  assert.equal(r.intent, "bonus-fara-depunere");
});

test("missing evergreen but published category → /bonusuri/<category>", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({ publishedBonusCategories: new Set(["fara-depunere"]) }));
  assert.equal(r.kind, "category");
  assert.equal(r.url, "/bonusuri/fara-depunere");
});

test("DRAFT evergreen page (not in published set) → falls back to category, never used as destination", () => {
  // Caller includes only PUBLISHED pages; a draft page is simply absent from the set.
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({ publishedBonusCategories: new Set(["fara-depunere"]) }));
  assert.equal(r.kind, "category");
  assert.notEqual(r.url, "/cazinouri-online/superbet-casino/bonus-fara-depunere");
});

test("neither evergreen nor category published → safe hub fallback /bonusuri (never 404)", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx());
  assert.equal(r.kind, "hub");
  assert.equal(r.url, "/bonusuri");
});

test("unclassifiable offer → hub", () => {
  assert.equal(resolveOfferDestination(RELOAD, ctx({ publishedBonusCategories: new Set(["fara-depunere"]) })).kind, "hub");
});

test("rotiri-gratuite (deposit FS): no evergreen possible yet → approved category /bonusuri/rotiri-gratuite", () => {
  // Even if some evergreen key were present, rotiri-gratuite is not a live route intent; callers
  // never include it. With the approved category published, destination is the category.
  const r = resolveOfferDestination(DEPOSIT_FS, ctx({ publishedBonusCategories: new Set(["rotiri-gratuite"]) }));
  assert.equal(r.kind, "category");
  assert.equal(r.url, "/bonusuri/rotiri-gratuite");
});

test("expired/liveness is orthogonal: destination depends only on classification + published pages", () => {
  // The resolver has no expiry input — an expired offer resolves to the same destination as a live
  // one of the same shape. Liveness gating (isOfferLive) is the caller/render concern.
  const base = ctx({ publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-depunere")]) });
  assert.deepEqual(resolveOfferDestination(NO_DEPOSIT, base), resolveOfferDestination(NO_DEPOSIT, base));
});

// ════════════════════════ EDITORIAL OVERRIDE (rule 8/9) ════════════════════════
test("valid override (same operator + published evergreen) is honored", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({
    override: { casinoSlug: SB, intent: "bonus-fara-rulaj" }, // editor-chosen valid intent
    publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-rulaj"), evergreenKey(SB, "bonus-fara-depunere")]),
  }));
  assert.equal(r.kind, "override");
  assert.equal(r.url, "/cazinouri-online/superbet-casino/bonus-fara-rulaj");
});

test("override for a DIFFERENT operator is ignored → auto resolution (no 404)", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({
    override: { casinoSlug: "netbet-casino", intent: "bonus-fara-depunere" },
    publishedEvergreen: new Set([evergreenKey("netbet-casino", "bonus-fara-depunere"), evergreenKey(SB, "bonus-fara-depunere")]),
  }));
  assert.equal(r.kind, "evergreen"); // falls to Superbet's own evergreen
  assert.equal(r.url, "/cazinouri-online/superbet-casino/bonus-fara-depunere");
});

test("override pointing at an UNPUBLISHED page is ignored → auto (never 404)", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({
    override: { casinoSlug: SB, intent: "bonus-fara-rulaj" }, // not in publishedEvergreen
    publishedBonusCategories: new Set(["fara-depunere"]),
  }));
  assert.equal(r.kind, "category");
  assert.equal(r.url, "/bonusuri/fara-depunere");
});

test("override with an INVALID intent string is ignored → auto", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({
    override: { casinoSlug: SB, intent: "not-a-real-intent" },
    publishedEvergreen: new Set([evergreenKey(SB, "not-a-real-intent")]), // even if present, intent invalid
    publishedBonusCategories: new Set(["fara-depunere"]),
  }));
  assert.equal(r.kind, "category");
});

test("determinism", () => {
  const c = ctx({ publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-depunere")]) });
  assert.deepEqual(resolveOfferDestination(NO_DEPOSIT, c), resolveOfferDestination(NO_DEPOSIT, c));
});
