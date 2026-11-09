import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCmsFacts, scopeCmsFacts, factAllowedEntityIds, type BonusFactRow, type CasinoFactRow, type CmsFact } from "@/lib/ai/cms-facts";

const TODAY = "2026-07-01";

const bonus = (over: Partial<BonusFactRow> = {}): BonusFactRow => ({
  id: "b1", casinoId: "c1", offer: "Bonus Netbet", amount: "100% pana la 500 RON",
  wageringMultiplier: 30, wageringBasis: "bonus", isNoWagering: false, spinValue: 0.5, maxWin: 1000,
  kycRequired: true, eligibleSlots: ["Book of Ra", "Starburst"], verifiedAt: "2026-06-01",
  expiresAt: "2026-12-31", termsUrl: "https://netbet.ro/terms", ...over,
});
const casino = (over: Partial<CasinoFactRow> = {}): CasinoFactRow => ({
  id: "c1", name: "Netbet Casino", license: "ONJN L1160603W000308", licenseVerifiedAt: "2026-01-10", licenseSource: "https://onjn.gov.ro/x", ...over,
});
const factFor = (facts: CmsFact[], key: string) => facts.find((f) => f.factId.endsWith(`:${key}`));

test("extracts structured bonus fields; stable ids, provenance field, source + verified date", () => {
  const facts = buildCmsFacts({ bonuses: [bonus()], casinos: [] }, TODAY);
  const w = factFor(facts, "wagering")!;
  assert.equal(w.value, "30x pe bonus");
  assert.equal(w.field, "bonuses.wagering_multiplier");
  assert.equal(w.factId, "bonus:b1:wagering");
  assert.equal(w.entityId, "bonus:b1");
  assert.equal(w.sourceRef, "https://netbet.ro/terms");
  assert.equal(w.verifiedAt, "2026-06-01");
  assert.ok(factFor(facts, "spin_value")!.value.includes("RON"));
  assert.equal(factFor(facts, "kyc")!.value, "da");
  assert.ok(factFor(facts, "eligible_slots")!.value.includes("Book of Ra"));
  assert.equal(factFor(facts, "validity")!.value, "2026-12-31");
});

test("max_win is labelled as max WIN, explicitly NOT a maximum withdrawal cap", () => {
  const f = factFor(buildCmsFacts({ bonuses: [bonus()], casinos: [] }, TODAY), "max_win")!;
  assert.equal(f.field, "bonuses.max_win");
  assert.match(f.claim, /max win/i);
  assert.match(f.claim, /NU plafon de retragere/i); // never conflated with retragere maxima
});

test("missing/null columns produce NO fact (values are never invented)", () => {
  const sparse = bonus({ wageringMultiplier: null, isNoWagering: null, spinValue: null, maxWin: null, kycRequired: null, eligibleSlots: null, amount: null, expiresAt: null });
  const facts = buildCmsFacts({ bonuses: [sparse], casinos: [] }, TODAY);
  assert.equal(facts.length, 0); // nothing structured present → no facts
});

test("wagering prefers the structured flag: is_no_wagering=true → 'fara rulaj'", () => {
  const f = factFor(buildCmsFacts({ bonuses: [bonus({ isNoWagering: true })], casinos: [] }, TODAY), "wagering")!;
  assert.equal(f.value, "fara rulaj");
  assert.equal(f.field, "bonuses.is_no_wagering");
});

test("status: verified (has verifiedAt, not expired) vs present (no verifiedAt) vs expired", () => {
  const verified = factFor(buildCmsFacts({ bonuses: [bonus()], casinos: [] }, TODAY), "wagering")!;
  assert.equal(verified.status, "verified");

  const present = factFor(buildCmsFacts({ bonuses: [bonus({ verifiedAt: null, expiresAt: null })], casinos: [] }, TODAY), "wagering")!;
  assert.equal(present.status, "present");
  assert.equal(present.verifiedAt, null);

  const expired = factFor(buildCmsFacts({ bonuses: [bonus({ expiresAt: "2024-01-01" })], casinos: [] }, TODAY), "wagering")!;
  assert.equal(expired.status, "expired"); // expired takes precedence even with a verifiedAt
});

test("casino license fact carries value + verification + source; no license → no fact", () => {
  const f = factFor(buildCmsFacts({ bonuses: [], casinos: [casino()] }, TODAY), "license")!;
  assert.equal(f.value, "ONJN L1160603W000308");
  assert.equal(f.field, "casinos.license");
  assert.equal(f.status, "verified");
  assert.equal(f.sourceRef, "https://onjn.gov.ro/x");
  assert.equal(buildCmsFacts({ bonuses: [], casinos: [casino({ license: null })] }, TODAY).length, 0);
});

test("scopeCmsFacts: keeps only brief-relevant entities (scoped entities ∪ relation endpoints); caps", () => {
  const facts = buildCmsFacts({ bonuses: [bonus(), bonus({ id: "bX", casinoId: "cX", offer: "Alt bonus" })], casinos: [casino()] }, TODAY);
  const scoped = { cmsEntities: [{ id: "casino:c1" }], cmsRelations: [{ sourceEntityId: "casino:c1", targetEntityId: "bonus:b1" }] };
  const { facts: kept, total } = scopeCmsFacts(facts, scoped, 100);
  assert.ok(kept.every((f) => f.entityId === "casino:c1" || f.entityId === "bonus:b1"));
  assert.ok(!kept.some((f) => f.entityId === "bonus:bX")); // unrelated bonus dropped
  assert.equal(kept.length, total);

  const capped = scopeCmsFacts(facts, scoped, 2);
  assert.equal(capped.facts.length, 2); // respects the cap
});

// ── AI-2.6.1: discovered entities contribute facts via the shared allowed-id set ──
test("factAllowedEntityIds unions scoped entities + discovered entities + relation endpoints", () => {
  const allowed = factAllowedEntityIds({
    cmsEntities: [{ id: "bonus_type:nodep" }],
    cmsRelations: [{ sourceEntityId: "bonus:b1", targetEntityId: "bonus_type:nodep" }],
    discoveredEntities: [{ id: "casino:c1" }],
  });
  assert.ok(allowed.has("bonus_type:nodep") && allowed.has("bonus:b1") && allowed.has("casino:c1"));
});

test("scopeCmsFacts surfaces facts for reverse-discovered entities (category coverage)", () => {
  const facts = buildCmsFacts({ bonuses: [bonus({ id: "b1", casinoId: "c1" })], casinos: [casino({ id: "c1" })] }, TODAY);
  const scoped = {
    cmsEntities: [{ id: "bonus_type:nodep" }], // only the taxonomy anchor is "confirmed"
    cmsRelations: [{ sourceEntityId: "bonus:b1", targetEntityId: "bonus_type:nodep" }],
    discoveredEntities: [{ id: "bonus:b1" }, { id: "casino:c1" }], // reverse-discovered
  };
  const { facts: kept } = scopeCmsFacts(facts, scoped, 100);
  assert.ok(kept.some((f) => f.entityId === "bonus:b1")); // bonus facts surface
  assert.ok(kept.some((f) => f.entityId === "casino:c1")); // casino license surfaces
});
