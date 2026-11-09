import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyFactualClaim, extractNumbers, factualTokens } from "@/lib/ai/fact-verification";
import type { CmsFact } from "@/lib/ai/cms-facts";

const F = (over: Partial<CmsFact> = {}): CmsFact => ({
  factId: "bonus:b1:wagering", entityId: "bonus:b1", entityName: "Bonus Netbet",
  claim: "rulaj", value: "30x pe bonus", field: "bonuses.wagering_multiplier",
  verifiedAt: "2026-06-01", sourceRef: "https://netbet.ro/terms", status: "verified", numericValue: 30, ...over,
});
const ctx = (facts: CmsFact[], known: string[] = []) => ({
  cmsFacts: facts,
  knownRefs: new Set([...facts.flatMap(factualTokens), ...known.map((k) => k.toLowerCase())]),
});

test("extractNumbers parses integers + decimals (comma/dot)", () => {
  assert.deepEqual(extractNumbers("rulaj de 30x si 0,5 RON, plafon 1.000"), [30, 0.5, 1]);
});

test("fabricated sourceRef (in NO source) → invented (error)", () => {
  const r = verifyFactualClaim({ claim: "rulaj 30x", sourceRef: "https://inventat.example/sursa" }, ctx([F()]));
  assert.equal(r.verdict, "invented");
});

test("recognized non-fact ref (internal link) → unverifiable (editorial review, not error)", () => {
  const r = verifyFactualClaim({ claim: "Netbet are licenta ONJN", sourceRef: "/cazinouri-online/netbet-casino" }, ctx([F()], ["/cazinouri-online/netbet-casino"]));
  assert.equal(r.verdict, "unverifiable");
});

test("empty sourceRef → unverifiable (editorial review)", () => {
  assert.equal(verifyFactualClaim({ claim: "rulaj mare", sourceRef: null }, ctx([F()])).verdict, "unverifiable");
  assert.equal(verifyFactualClaim({ claim: "rulaj mare", sourceRef: "  " }, ctx([F()])).verdict, "unverifiable");
});

test("numeric claim matching a VERIFIED fact (by field) → supported", () => {
  const r = verifyFactualClaim({ claim: "Rulajul este de 30x.", sourceRef: "bonuses.wagering_multiplier" }, ctx([F()]));
  assert.equal(r.verdict, "supported");
});

test("numeric claim matching by factId or sourceRef URL → supported", () => {
  assert.equal(verifyFactualClaim({ claim: "30x", sourceRef: "bonus:b1:wagering" }, ctx([F()])).verdict, "supported");
  assert.equal(verifyFactualClaim({ claim: "30x", sourceRef: "https://netbet.ro/terms" }, ctx([F()])).verdict, "supported");
});

test("numeric CONTRADICTION (claim says 50x, fact says 30x) → contradictory (error)", () => {
  const r = verifyFactualClaim({ claim: "Rulajul este de 50x.", sourceRef: "bonuses.wagering_multiplier" }, ctx([F()]));
  assert.equal(r.verdict, "contradictory");
});

test("source EXISTS but WRONG fact (citing max_win for a wagering number) → contradictory", () => {
  const maxWin = F({ factId: "bonus:b1:max_win", field: "bonuses.max_win", value: "1000 RON", numericValue: 1000 });
  const r = verifyFactualClaim({ claim: "Rulaj 30x", sourceRef: "bonuses.max_win" }, ctx([maxWin]));
  assert.equal(r.verdict, "contradictory"); // 30 contradicts the cited max_win=1000
});

test("expired fact cited → expired (error, cannot be presented as active)", () => {
  const r = verifyFactualClaim({ claim: "rulaj 30x", sourceRef: "bonuses.wagering_multiplier" }, ctx([F({ status: "expired" })]));
  assert.equal(r.verdict, "expired");
});

test("present fact (no verifiedAt) with matching number → unverifiable (editorial review)", () => {
  const r = verifyFactualClaim({ claim: "rulaj 30x", sourceRef: "bonuses.wagering_multiplier" }, ctx([F({ status: "present", verifiedAt: null })]));
  assert.equal(r.verdict, "unverifiable");
});

test("conceptual claim (no numbers) citing a verified fact → supported", () => {
  const lic = F({ factId: "casino:c1:license", entityId: "casino:c1", field: "casinos.license", value: "ONJN ...", numericValue: null });
  const r = verifyFactualClaim({ claim: "Operatorul detine licenta ONJN valida.", sourceRef: "casinos.license" }, ctx([lic]));
  assert.equal(r.verdict, "supported");
});
