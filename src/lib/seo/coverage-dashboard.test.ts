import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildDashboardRows, aggregateKpis, filterAndSortRows, intentFacets, type DashboardRow,
} from "@/lib/seo/coverage-dashboard";
import type { CoverageState, CoverageConfidence } from "@/lib/seo/coverage";
import type { ClusterForMapping } from "@/lib/seo/url-mapping";
import type { UrlEntry, UrlType } from "@/lib/db/url-inventory";

function mkRow(id: string, over: { state?: CoverageState; score?: number; confidence?: CoverageConfidence; intent?: string | null; insufficient?: boolean } = {}): DashboardRow {
  const state = over.state ?? "gap";
  return {
    clusterId: id, clusterName: id, primaryKeyword: null, intent: over.intent ?? null, keywordCount: over.insufficient ? 0 : 1,
    coverage: { clusterId: id, clusterName: id, state, confidence: "medium", targetUrl: null, targetType: null, targetScope: null, targetStatus: null, candidateScore: null, recommendation: null, reasons: [] },
    opportunity: { score: over.score ?? 50, confidence: over.confidence ?? "medium", opportunityType: "create", breakdown: [], missingFactors: over.insufficient ? ["demand", "feasibility", "intent"] : [] },
    insufficientData: over.insufficient ?? false,
  };
}
const ids = (rows: DashboardRow[]) => rows.map((r) => r.clusterId);

// ── KPI aggregation ─────────────────────────────────────────────────────────────
test("aggregateKpis counts total + per state + insufficientData", () => {
  const rows = [mkRow("a", { state: "gap" }), mkRow("b", { state: "gap" }), mkRow("c", { state: "covered" }), mkRow("d", { state: "planned" }), mkRow("e", { state: "candidate" }), mkRow("f", { state: "ambiguous", insufficient: true })];
  const k = aggregateKpis(rows);
  assert.deepEqual(k, { total: 6, covered: 1, candidate: 1, planned: 1, gap: 2, ambiguous: 1, insufficientData: 1 });
});

test("aggregateKpis on empty = all zero", () => {
  assert.deepEqual(aggregateKpis([]), { total: 0, covered: 0, candidate: 0, planned: 0, gap: 0, ambiguous: 0, insufficientData: 0 });
});

// ── filtering ─────────────────────────────────────────────────────────────────
test("filters by state, confidence and intent (exact)", () => {
  const rows = [mkRow("a", { state: "gap", confidence: "high", intent: "commercial" }), mkRow("b", { state: "covered", confidence: "low", intent: "informational" }), mkRow("c", { state: "gap", confidence: "low", intent: "commercial" })];
  assert.deepEqual(ids(filterAndSortRows(rows, { state: "gap" })).sort(), ["a", "c"]);
  assert.deepEqual(ids(filterAndSortRows(rows, { confidence: "low" })).sort(), ["b", "c"]);
  assert.deepEqual(ids(filterAndSortRows(rows, { intent: "commercial" })).sort(), ["a", "c"]);
  assert.deepEqual(ids(filterAndSortRows(rows, { state: "gap", confidence: "high" })), ["a"]);
});

test("invalid filter values are ignored (no crash, no empty)", () => {
  const rows = [mkRow("a"), mkRow("b")];
  assert.equal(filterAndSortRows(rows, { state: "bogus", confidence: "nope" }).length, 2);
});

// ── sorting ─────────────────────────────────────────────────────────────────────
test("default sort is by opportunity score desc, tie-broken by clusterId", () => {
  const rows = [mkRow("b", { score: 50 }), mkRow("a", { score: 50 }), mkRow("c", { score: 90 })];
  assert.deepEqual(ids(filterAndSortRows(rows, {})), ["c", "a", "b"]); // 90 first; 50-tie → a before b
});

test("dir=asc sorts by score ascending", () => {
  const rows = [mkRow("a", { score: 90 }), mkRow("b", { score: 10 })];
  assert.deepEqual(ids(filterAndSortRows(rows, { dir: "asc" })), ["b", "a"]);
});

test("insufficient-data rows are NEVER placed in the top, even at score 100", () => {
  const rows = [mkRow("poor", { score: 100, insufficient: true }), mkRow("good", { score: 50, insufficient: false })];
  assert.deepEqual(ids(filterAndSortRows(rows, {})), ["good", "poor"]); // sufficient first despite lower score
  assert.deepEqual(ids(filterAndSortRows(rows, { dir: "asc" })), ["good", "poor"]); // demoted regardless of dir
});

test("intentFacets returns distinct non-null intents sorted", () => {
  const rows = [mkRow("a", { intent: "commercial" }), mkRow("b", { intent: null }), mkRow("c", { intent: "commercial" }), mkRow("d", { intent: "transactional" })];
  assert.deepEqual(intentFacets(rows), ["commercial", "transactional"]);
});

// ── buildDashboardRows integration (combines coverage + opportunity) ────────────
function uentry(url: string, type: UrlType, status: "existing" | "planned", title?: string): UrlEntry {
  return { url, type, title: title ?? url, source: "test", status };
}
test("buildDashboardRows joins coverage + opportunity; sufficient cluster", () => {
  const clusters: ClusterForMapping[] = [{ id: "c1", name: "NetBet", intent: "commercial", primaryKeyword: "netbet", keywords: [{ id: "k1", keyword: "netbet", normalized: "netbet", mappedUrl: null, mappingStatus: "none" }] }];
  const metrics = new Map([["c1", [{ keyword: "netbet", volume: 1000, difficulty: 30, intent: "commercial" }]]]);
  const inv = [uentry("/cazinouri-online/netbet", "casino", "existing", "NetBet")];
  const rows = buildDashboardRows(clusters, metrics, inv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].coverage.state, "candidate"); // lexical, not confirmed
  assert.equal(rows[0].insufficientData, false);
  assert.ok(rows[0].opportunity.score > 0);
});

test("buildDashboardRows flags a keyword-less cluster as insufficientData", () => {
  const clusters: ClusterForMapping[] = [{ id: "c2", name: "Gol", intent: null, primaryKeyword: null, keywords: [] }];
  const rows = buildDashboardRows(clusters, new Map(), [uentry("/cazinouri-online/netbet", "casino", "existing")]);
  assert.equal(rows[0].insufficientData, true);
  assert.ok(["gap", "ambiguous"].includes(rows[0].coverage.state));
});

test("buildDashboardRows on no clusters = empty", () => {
  assert.deepEqual(buildDashboardRows([], new Map(), []), []);
});
