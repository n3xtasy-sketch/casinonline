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

// ════════════════════════ EDITORIAL OVERRIDE (rules 8 + 9 + G) ════════════════════════
// An offer qualifying for BOTH no-deposit and no-wagering (so bonus-fara-rulaj is a compatible pick).
const NO_DEP_NO_WAGER = offer({ typeSlug: "fara-depunere", isNoDeposit: true, isNoWagering: true });

test("valid, COMPATIBLE override (same operator + published) is honored", () => {
  const r = resolveOfferDestination(NO_DEP_NO_WAGER, ctx({
    override: { casinoSlug: SB, intent: "bonus-fara-rulaj" }, // offer IS no-wagering → compatible
    publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-rulaj"), evergreenKey(SB, "bonus-fara-depunere")]),
  }));
  assert.equal(r.kind, "override");
  assert.equal(r.url, "/cazinouri-online/superbet-casino/bonus-fara-rulaj");
});

test("override to an INCOMPATIBLE page of the SAME operator is ignored (rule G)", () => {
  // NO_DEPOSIT offer is NOT cashback → the operator's published bonus-cashback page is incompatible.
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({
    override: { casinoSlug: SB, intent: "bonus-cashback" },
    publishedEvergreen: new Set([evergreenKey(SB, "bonus-cashback"), evergreenKey(SB, "bonus-fara-depunere")]),
  }));
  assert.notEqual(r.kind, "override");
  assert.notEqual(r.url, "/cazinouri-online/superbet-casino/bonus-cashback");
  assert.equal(r.url, "/cazinouri-online/superbet-casino/bonus-fara-depunere"); // auto, compatible
});

test("override for a DIFFERENT operator is ignored → auto resolution (no 404)", () => {
  const r = resolveOfferDestination(NO_DEPOSIT, ctx({
    override: { casinoSlug: "netbet-casino", intent: "bonus-fara-depunere" },
    publishedEvergreen: new Set([evergreenKey("netbet-casino", "bonus-fara-depunere"), evergreenKey(SB, "bonus-fara-depunere")]),
  }));
  assert.equal(r.kind, "evergreen"); // falls to Superbet's own evergreen
  assert.equal(r.url, "/cazinouri-online/superbet-casino/bonus-fara-depunere");
});

test("COMPATIBLE override pointing at an UNPUBLISHED page is ignored → auto (never 404)", () => {
  const r = resolveOfferDestination(NO_DEP_NO_WAGER, ctx({
    override: { casinoSlug: SB, intent: "bonus-fara-rulaj" }, // compatible but NOT in publishedEvergreen
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

// ════════════════════════ URL-2 INTEGRATION SCENARIOS ════════════════════════
test("operator change → destination follows the offer's operator", () => {
  const c = ctx({ publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-depunere"), evergreenKey("netbet-casino", "bonus-fara-depunere")]) });
  assert.equal(resolveOfferDestination(NO_DEPOSIT, c).url, "/cazinouri-online/superbet-casino/bonus-fara-depunere");
  assert.equal(resolveOfferDestination(offer({ typeSlug: "fara-depunere", isNoDeposit: true, casinoSlug: "netbet-casino" }), c).url, "/cazinouri-online/netbet-casino/bonus-fara-depunere");
});

test("offer TYPE change → different canonical destination", () => {
  const c = ctx({ publishedBonusCategories: new Set(["fara-depunere", "cashback"]) });
  assert.equal(resolveOfferDestination(NO_DEPOSIT, c).url, "/bonusuri/fara-depunere");
  assert.equal(resolveOfferDestination(CASHBACK, c).url, "/bonusuri/cashback"); // same offer slot, type changed
});

test("multiple offers of the SAME operator resolve independently to their own intent", () => {
  const c = ctx({ publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-depunere"), evergreenKey(SB, "bonus-cashback")]) });
  const noDep = resolveOfferDestination(offer({ typeSlug: "fara-depunere", isNoDeposit: true }), c);
  const cashback = resolveOfferDestination(offer({ typeSlug: "cashback" }), c);
  assert.equal(noDep.url, "/cazinouri-online/superbet-casino/bonus-fara-depunere");
  assert.equal(cashback.url, "/cazinouri-online/superbet-casino/bonus-cashback");
  assert.notEqual(noDep.url, cashback.url);
});

test("SEO destination is a content path — never an affiliate /go/ CTA link (separation)", () => {
  const urls = [
    resolveOfferDestination(NO_DEPOSIT, ctx({ publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-depunere")]) })).url,
    resolveOfferDestination(CASHBACK, ctx({ publishedBonusCategories: new Set(["cashback"]) })).url,
    resolveOfferDestination(RELOAD, ctx()).url,
  ];
  for (const u of urls) {
    assert.ok(!u.startsWith("/go/"), `${u} must not be an affiliate CTA link`);
    assert.ok(u.startsWith("/bonusuri") || u.startsWith("/cazinouri-online/"), `${u} must be a bonus/operator content path`);
  }
});

test("resolved url is a valid JSON-LD ItemList target (existing page shape)", () => {
  const ever = resolveOfferDestination(NO_DEPOSIT, ctx({ publishedEvergreen: new Set([evergreenKey(SB, "bonus-fara-depunere")]) }));
  assert.match(ever.url, /^\/cazinouri-online\/[^/]+\/[^/]+$/);
  const cat = resolveOfferDestination(NO_DEPOSIT, ctx({ publishedBonusCategories: new Set(["fara-depunere"]) }));
  assert.match(cat.url, /^\/bonusuri\/[^/]+$/);
});
