import { test } from "node:test";
import assert from "node:assert/strict";

import { computeCoverage, pageScope } from "@/lib/seo/coverage";
import type { ClusterForMapping, MappingKeyword } from "@/lib/seo/url-mapping";
import type { UrlEntry, UrlType } from "@/lib/db/url-inventory";

function uentry(url: string, type: UrlType, status: "existing" | "planned", title?: string): UrlEntry {
  return { url, type, title: title ?? url.replace(/[-/]/g, " ").trim(), source: "test", status };
}
let seq = 0;
function kw(keyword: string, over: Partial<MappingKeyword> = {}): MappingKeyword {
  seq += 1;
  return { id: over.id ?? `k${seq}`, keyword, normalized: over.normalized ?? keyword.toLowerCase(), mappedUrl: over.mappedUrl ?? null, mappingStatus: over.mappingStatus ?? "none" };
}
function cluster(id: string, primaryKeyword: string | null, keywords: MappingKeyword[], name?: string): ClusterForMapping {
  return { id, name: name ?? id, intent: null, primaryKeyword, keywords };
}
const one = (clusters: ClusterForMapping[], inv: UrlEntry[]) => computeCoverage(clusters, inv)[0];

// ── pageScope ─────────────────────────────────────────────────────────────────
test("pageScope distinguishes the three bonus page types", () => {
  assert.equal(pageScope("/bonusuri/bonus-fara-depunere"), "general");
  assert.equal(pageScope("/cazinouri-online/maxbet-casino/bonus-fara-depunere"), "operator");
  assert.equal(pageScope("/bonusuri-casino/maxbet-fara-depunere"), "offer");
  assert.equal(pageScope("/cazinouri-online/netbet"), "other"); // casino review, 1 segment
});

// ── confirmed mapping drives covered / planned / ambiguous ──────────────────────
test("confirmed mapping → PUBLISHED page = covered/high", () => {
  const u = "/bonusuri/bonus-fara-depunere";
  const c = cluster("c1", "bonus fara depunere", [kw("bonus fara depunere", { mappedUrl: u, mappingStatus: "confirmed" })]);
  const r = one([c], [uentry(u, "category", "existing")]);
  assert.equal(r.state, "covered");
  assert.equal(r.confidence, "high");
  assert.equal(r.targetStatus, "existing");
});

test("confirmed mapping → DRAFT page = planned (not covered)", () => {
  const u = "/bonusuri/bonus-fara-depunere";
  const c = cluster("c1", "bonus fara depunere", [kw("bonus fara depunere", { mappedUrl: u, mappingStatus: "confirmed" })]);
  const r = one([c], [uentry(u, "category", "planned")]);
  assert.equal(r.state, "planned");
  assert.equal(r.targetStatus, "planned");
});

test("confirmed mapping → NON-EXISTENT URL = ambiguous + reason", () => {
  const u = "/bonusuri/sters";
  const c = cluster("c1", "bonus x", [kw("bonus x", { mappedUrl: u, mappingStatus: "confirmed" })]);
  const r = one([c], [uentry("/bonusuri/altceva", "category", "existing")]);
  assert.equal(r.state, "ambiguous");
  assert.equal(r.targetStatus, "missing");
  assert.ok(r.reasons.some((x) => /inexistent/i.test(x)));
});

// ── non-confirmed lexical = candidate (never covered) ───────────────────────────
test("strong lexical match to a published detail page (not confirmed) = candidate/medium", () => {
  const c = cluster("c1", "netbet", [kw("netbet")]);
  const r = one([c], [uentry("/cazinouri-online/netbet", "casino", "existing", "NetBet")]);
  assert.equal(r.state, "candidate");
  assert.equal(r.confidence, "medium");
  assert.ok(["use_existing", "expand_existing"].includes(r.recommendation!));
});

// ── gap ─────────────────────────────────────────────────────────────────────────
test("no matching page = gap", () => {
  const c = cluster("c1", "zzqq plugh xyzzy", [kw("zzqq plugh xyzzy")]);
  const r = one([c], [uentry("/cazinouri-online/netbet", "casino", "existing", "NetBet")]);
  assert.equal(r.state, "gap");
});

// ── ambiguous (generic-only cluster) ────────────────────────────────────────────
test("generic-only cluster (no specific tokens) = ambiguous", () => {
  const c = cluster("c1", "casino online", [kw("casino online"), kw("cazino online")]);
  const r = one([c], [uentry("/cazinouri-online", "hub", "existing", "Cazinouri online")]);
  assert.equal(r.state, "ambiguous");
});

// ── general vs Maxbet offer: offer match is candidate/LOW + scope reason, NOT covered ──
test("match onto an individual OFFER page is candidate/low with an offer-scope reason", () => {
  const offer = "/bonusuri-casino/maxbet-fara-depunere";
  const c = cluster("c1", "maxbet fara depunere", [kw("maxbet fara depunere")]);
  const inv = [
    uentry(offer, "bonus", "existing", "Maxbet fara depunere"),
    uentry("/bonusuri/bonus-fara-depunere", "category", "planned", "Bonus fara depunere"), // general page (draft)
  ];
  const r = one([c], inv);
  assert.equal(r.state, "candidate");
  assert.equal(r.targetScope, "offer");
  assert.equal(r.confidence, "low");
  assert.ok(r.reasons.some((x) => /ofert/i.test(x)));
  assert.notEqual(r.state, "covered");
});

// ── REGRESSION (point 4): a GENERIC cluster must prefer the general DRAFT page over a
//    published individual OFFER — result = planned on the generic URL, NOT candidate for Maxbet ──
test("generic 'bonus fara depunere' + draft general page + published Maxbet offer → planned on the GENERIC url", () => {
  const general = "/bonusuri/bonus-fara-depunere";
  const offer = "/bonusuri-casino/maxbet-fara-depunere";
  const c = cluster("c1", "bonus fara depunere", [kw("bonus fara depunere")]);
  const inv = [
    uentry(general, "category", "planned", "Bonus fara depunere"),
    uentry(offer, "bonus", "existing", "Maxbet fara depunere"),
  ];
  const r = one([c], inv);
  assert.equal(r.state, "planned");
  assert.equal(r.targetUrl, general);
  assert.equal(r.targetScope, "general");
  assert.notEqual(r.targetUrl, offer); // must NOT pick the Maxbet offer
});

// ── planned detection: a DRAFT target page is `planned`, not a false `gap` ──────
test("best match is a DRAFT page → planned (not gap)", () => {
  const c = cluster("c1", "bonus fara depunere", [kw("bonus fara depunere")]);
  const inv = [uentry("/bonusuri/bonus-fara-depunere", "category", "planned", "Bonus fara depunere")];
  const r = one([c], inv);
  assert.equal(r.state, "planned");
  assert.equal(r.targetStatus, "planned");
});

// ── REGRESSION (hub head-term): a listing hub is recognized as Candidate, not Gap/Covered ──
test("head/listing cluster 'cele mai bune cazinouri online' → candidate for the /cazinouri-online hub", () => {
  const c = cluster("c1", "cele mai bune cazinouri online", [kw("cele mai bune cazinouri online")], "Top Cazinouri Online");
  const inv = [
    uentry("/cazinouri-online", "hub", "existing", "Cazinouri online"),
    uentry("/cazinouri-online/netbet-casino", "casino", "existing", "NetBet Casino"),
  ];
  const r = one([c], inv);
  assert.equal(r.state, "candidate");
  assert.equal(r.targetUrl, "/cazinouri-online");
  assert.notEqual(r.state, "covered"); // never auto-covered (not confirmed)
  assert.ok(r.reasons.some((x) => /head\/listing|hub-ul general/i.test(x)));
});

// negative: operator-specific keyword must NOT become a false casino-hub candidate
test("operator-specific cluster does NOT become a /cazinouri-online hub candidate", () => {
  const c = cluster("c1", "netbet bonus fara depunere", [kw("netbet bonus fara depunere")]);
  const r = one([c], [uentry("/cazinouri-online", "hub", "existing", "Cazinouri online")]);
  assert.notEqual(r.targetUrl, "/cazinouri-online");
  assert.notEqual(r.state, "candidate");
});

// negative: a generic 'casino/cazino online' cluster (singular, no 'cazinouri' slug token) is NOT
// upgraded to a hub Candidate — it stays `ambiguous` (the hub may be the weak best match, but it is
// never promoted to Candidate the way a true 'cazinouri online' head term is).
test("generic casino/cazino cluster (no 'cazinouri' token) is NOT promoted to a hub candidate", () => {
  const c = cluster("c1", "casino online", [kw("casino online"), kw("cazino online")]);
  const r = one([c], [uentry("/cazinouri-online", "hub", "existing", "Cazinouri online")]);
  assert.equal(r.state, "ambiguous");
  assert.notEqual(r.state, "candidate");
});

// point 8: validated cases unaffected — bonus clusters still map to the general page, NOT the hub
test("bonus cluster → planned on the general bonus page even when the casino hub exists", () => {
  const c = cluster("c1", "bonus fara depunere", [kw("bonus fara depunere")]);
  const inv = [
    uentry("/cazinouri-online", "hub", "existing", "Cazinouri online"),
    uentry("/bonusuri/bonus-fara-depunere", "category", "planned", "Bonus fara depunere"),
  ];
  const r = one([c], inv);
  assert.equal(r.state, "planned");
  assert.equal(r.targetUrl, "/bonusuri/bonus-fara-depunere");
});

test("rotiri gratuite fara depunere → planned on its general page", () => {
  const c = cluster("c1", "rotiri gratuite fara depunere", [kw("rotiri gratuite fara depunere")]);
  const r = one([c], [uentry("/bonusuri/rotiri-gratuite-fara-depunere", "category", "planned", "Rotiri gratuite fara depunere")]);
  assert.equal(r.state, "planned");
  assert.equal(r.targetUrl, "/bonusuri/rotiri-gratuite-fara-depunere");
});

// ── missing data: empty cluster does not throw ──────────────────────────────────
test("cluster with no keywords does not crash → gap", () => {
  const c = cluster("c1", null, [], "Gol");
  const r = one([c], [uentry("/cazinouri-online/netbet", "casino", "existing", "NetBet")]);
  assert.ok(["gap", "ambiguous"].includes(r.state));
});

// ── compatibility: deterministic, one row per cluster, sorted by clusterId ──────
test("returns one row per cluster, deterministically sorted", () => {
  const inv = [uentry("/cazinouri-online/netbet", "casino", "existing", "NetBet")];
  const clusters = [cluster("c2", "x", [kw("x")]), cluster("c1", "netbet", [kw("netbet")])];
  const rows = computeCoverage(clusters, inv);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.clusterId), ["c1", "c2"]);
  assert.deepEqual(computeCoverage(clusters, inv), rows); // deterministic
});
