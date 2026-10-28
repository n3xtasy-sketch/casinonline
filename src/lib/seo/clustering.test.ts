import { test } from "node:test";
import assert from "node:assert/strict";

import {
  tokenize,
  intentBuckets,
  weightedDice,
  proposePrimaryKeyword,
  generateClusterSuggestions,
  detectCannibalization,
  type ClusterKeyword,
  type ClusterSuggestion,
} from "@/lib/seo/clustering";

// Build a keyword with sensible defaults; `normalized` defaults to a dedup-form of `keyword`.
let seq = 0;
function kw(keyword: string, over: Partial<ClusterKeyword> = {}): ClusterKeyword {
  seq += 1;
  return {
    id: over.id ?? `k${seq}`,
    keyword,
    normalized: over.normalized ?? keyword.toLowerCase().replace(/\s+/g, " ").trim(),
    intent: over.intent ?? null,
    volume: over.volume ?? null,
    difficulty: over.difficulty ?? null,
    parentTopic: over.parentTopic ?? null,
    clusterId: over.clusterId ?? null,
    mappedUrl: over.mappedUrl ?? null,
    mappingStatus: over.mappingStatus ?? "none",
  };
}

// ── tokenization / helpers ─────────────────────────────────────────────────────

test("tokenize: drops stopwords + short tokens, keeps domain words", () => {
  assert.deepEqual(tokenize("book of ra deluxe"), ["book", "ra", "deluxe"]); // "of" stopword
  assert.deepEqual(tokenize("bonus fara depunere"), ["bonus", "fara", "depunere"]); // "fara" kept (domain)
});

test("intentBuckets: parses multi-valued intent cells", () => {
  assert.deepEqual([...intentBuckets("Informational, Commercial")].sort(), ["commercial", "informational"]);
  assert.deepEqual([...intentBuckets(null)], []);
});

test("weightedDice: identical token sets = 1, disjoint = 0", () => {
  const w = new Map<string, number>();
  assert.equal(weightedDice(["a", "b"], ["a", "b"], w), 1);
  assert.equal(weightedDice(["a"], ["b"], w), 0);
});

// ── Parent Topic clustering ─────────────────────────────────────────────────────

test("Parent Topic clustering: same parent topic groups together", () => {
  const kws = [
    kw("bonus cazino 2024", { id: "p1", parentTopic: "Bonusuri cazino", intent: "Commercial" }),
    kw("bonus cazino nou", { id: "p2", parentTopic: "Bonusuri cazino", intent: "Commercial" }),
    kw("ruleta europeana", { id: "p3", parentTopic: "Ruleta" }),
  ];
  const { suggestions } = generateClusterSuggestions(kws);
  const g = suggestions.find((s) => s.keywordIds.includes("p1"));
  assert.ok(g, "expected a suggestion containing p1");
  assert.deepEqual([...g!.keywordIds].sort(), ["p1", "p2"]);
  assert.ok(g!.method === "parent_topic" || g!.method === "hybrid");
  assert.ok(g!.reasons.some((r) => /Parent Topic/.test(r)));
});

// ── Lexical clustering ──────────────────────────────────────────────────────────

test("Lexical clustering: groups on >=2 discriminative shared tokens", () => {
  const kws = [
    kw("book of ra deluxe", { id: "l1" }),
    kw("book of ra magic", { id: "l2" }),
    kw("book of ra classic", { id: "l3" }),
    kw("sizzling hot slot", { id: "l4" }),
  ];
  const { suggestions } = generateClusterSuggestions(kws);
  const g = suggestions.find((s) => s.keywordIds.includes("l1"));
  assert.ok(g, "expected book-of-ra lexical cluster");
  assert.deepEqual([...g!.keywordIds].sort(), ["l1", "l2", "l3"]);
  assert.equal(g!.method, "lexical");
  assert.ok(g!.sharedTerms.includes("book") && g!.sharedTerms.includes("ra"));
  // l4 shares nothing discriminative → not grouped with them.
  assert.ok(!g!.keywordIds.includes("l4"));
});

test("does NOT group on a single common word", () => {
  // Share only "online" (generic) or a single token → no cluster.
  const kws = [
    kw("ruleta online", { id: "s1" }),
    kw("blackjack online", { id: "s2" }),
    kw("poker online", { id: "s3" }),
  ];
  const { suggestions } = generateClusterSuggestions(kws);
  assert.equal(suggestions.length, 0);
});

// ── Intent protection / conflict ─────────────────────────────────────────────────

test("Intent conflict: lexically-overlapping but opposite intent is NOT grouped", () => {
  const kws = [
    kw("strategie ruleta avansata", { id: "i1", intent: "Informational" }),
    kw("strategie ruleta bani", { id: "i2", intent: "Transactional" }),
  ];
  const { suggestions } = generateClusterSuggestions(kws);
  // They share strategie+ruleta (2 disc tokens) but conflicting intent → no merge.
  const together = suggestions.find((s) => s.keywordIds.includes("i1") && s.keywordIds.includes("i2"));
  assert.equal(together, undefined);
});

test("ambiguous group (intent conflict under same Parent Topic) is flagged needsReview", () => {
  const kws = [
    kw("ruleta cum se joaca", { id: "a1", parentTopic: "Ruleta", intent: "Informational" }),
    kw("ruleta pe bani reali", { id: "a2", parentTopic: "Ruleta", intent: "Transactional" }),
  ];
  const { suggestions } = generateClusterSuggestions(kws);
  const g = suggestions.find((s) => s.keywordIds.includes("a1"));
  assert.ok(g, "parent-topic group should still be suggested");
  assert.equal(g!.needsReview, true);
  assert.ok(g!.reasons.some((r) => /conflict de intenție/.test(r)));
});

// ── Confidence score ─────────────────────────────────────────────────────────────

test("Confidence score: within [0,100], heuristic, parent-topic >= lexical, needsSerpValidation set", () => {
  const kws = [
    kw("bonus cazino mare", { id: "c1", parentTopic: "Bonusuri", intent: "Commercial" }),
    kw("bonus cazino rapid", { id: "c2", parentTopic: "Bonusuri", intent: "Commercial" }),
    kw("rotiri gratuite noi", { id: "c3" }),
    kw("rotiri gratuite extra", { id: "c4" }),
  ];
  const { suggestions } = generateClusterSuggestions(kws);
  for (const s of suggestions) {
    assert.ok(s.confidence >= 0 && s.confidence <= 100);
    assert.equal(typeof s.needsSerpValidation, "boolean");
  }
  const parent = suggestions.find((s) => s.keywordIds.includes("c1"))!;
  const lexical = suggestions.find((s) => s.keywordIds.includes("c3"))!;
  assert.ok(parent.confidence >= lexical.confidence);
  // Pure lexical groups always want SERP validation later.
  assert.equal(lexical.needsSerpValidation, true);
});

// ── Primary keyword (NOT just highest volume) ─────────────────────────────────────

test("Primary keyword: central head term beats a high-volume long-tail outlier", () => {
  const members = [
    kw("book of ra", { id: "h", volume: 500 }),
    kw("book of ra deluxe", { id: "b", volume: 400 }),
    kw("book of ra joc", { id: "c", volume: 300 }),
    kw("jocuri gratis book of ra bonus mare", { id: "d", volume: 900 }), // highest volume, long-tail
  ];
  const choice = proposePrimaryKeyword(members);
  assert.equal(choice.id, "h"); // central + head term, despite "d" having the max volume
  assert.notEqual(choice.id, "d");
});

// ── Editorial protection: assigned keywords never regrouped ──────────────────────

test("Editorial protection: keywords already in a cluster are never in any suggestion", () => {
  const kws = [
    kw("book of ra deluxe", { id: "x1", clusterId: "existing-cluster" }),
    kw("book of ra magic", { id: "x2" }),
    kw("book of ra classic", { id: "x3" }),
  ];
  const { suggestions } = generateClusterSuggestions(kws);
  for (const s of suggestions) assert.ok(!s.keywordIds.includes("x1"), "assigned keyword must not be regrouped");
});

// ── Suggestion dedup + stable ids ────────────────────────────────────────────────

test("Suggestion dedup: each keyword appears in at most one suggestion; ids are stable", () => {
  const kws = [
    kw("book of ra deluxe", { id: "d1", parentTopic: "Book of Ra" }),
    kw("book of ra magic", { id: "d2", parentTopic: "Book of Ra" }),
    kw("sizzling hot deluxe", { id: "d3" }),
    kw("sizzling hot classic", { id: "d4" }),
  ];
  const run1 = generateClusterSuggestions(kws);
  const run2 = generateClusterSuggestions([...kws].reverse()); // order-independent
  const seen = new Set<string>();
  for (const s of run1.suggestions) for (const id of s.keywordIds) {
    assert.ok(!seen.has(id), `keyword ${id} in multiple suggestions`);
    seen.add(id);
  }
  // Same membership → same stable suggestion id regardless of input order.
  const ids1 = run1.suggestions.map((s) => s.id).sort();
  const ids2 = run2.suggestions.map((s) => s.id).sort();
  assert.deepEqual(ids1, ids2);
});

// ── Cannibalization warnings (preliminary heuristics) ────────────────────────────

test("Cannibalization: two clusters sharing the same mapped_url → same_url warning", () => {
  const assigned = [
    kw("book of ra", { id: "u1", clusterId: "c1", mappedUrl: "/sloturi/book-of-ra" }),
    kw("ra deluxe", { id: "u2", clusterId: "c2", mappedUrl: "/sloturi/book-of-ra" }),
  ];
  const warnings = detectCannibalization([], assigned, [], new Map());
  const w = warnings.find((x) => x.kind === "same_url");
  assert.ok(w, "expected same_url warning");
  assert.deepEqual([...w!.refs].sort(), ["c1", "c2"]);
});

test("Cannibalization: lexically near-identical suggested clusters → cluster_overlap warning", () => {
  const pool = [
    kw("book of ra", { id: "o1" }),
    kw("book of ra deluxe", { id: "o2" }),
    kw("book of ra", { id: "o3" }),
    kw("book of ra deluxe", { id: "o4" }),
  ];
  const s1: ClusterSuggestion = base({ id: "s1", keywordIds: ["o1", "o2"], suggestedName: "Book of Ra A" });
  const s2: ClusterSuggestion = base({ id: "s2", keywordIds: ["o3", "o4"], suggestedName: "Book of Ra B" });
  const warnings = detectCannibalization([s1, s2], [], pool, new Map());
  assert.ok(warnings.some((w) => w.kind === "cluster_overlap"));
});

test("Cannibalization: unassigned keyword fitting 2+ clusters → keyword_multi_cluster warning", () => {
  const pool = [
    kw("book of ra deluxe", { id: "m1" }),
    kw("book of ra classic", { id: "m2" }),
    kw("book of ra", { id: "mX" }), // not in any suggestion, overlaps both
  ];
  const s1 = base({ id: "s1", keywordIds: ["m1"], suggestedName: "A" });
  const s2 = base({ id: "s2", keywordIds: ["m2"], suggestedName: "B" });
  const warnings = detectCannibalization([s1, s2], [], pool, new Map());
  const w = warnings.find((x) => x.kind === "keyword_multi_cluster");
  assert.ok(w, "expected keyword_multi_cluster warning");
  assert.ok(w!.refs.includes("mX"));
});

// ── FIX A: NEEDS REVIEW for ambiguous predominantly-lexical groups ───────────────

test("FIX A: bonus fara depunere / rotiri gratuite fara depunere → grouped but needsReview", () => {
  const { suggestions } = generateClusterSuggestions([
    kw("bonus fara depunere", { id: "f1" }),
    kw("rotiri gratuite fara depunere", { id: "f2" }),
  ]);
  const g = suggestions.find((s) => s.keywordIds.includes("f1") && s.keywordIds.includes("f2"));
  assert.ok(g, "pair should still be suggested (not discarded)");
  assert.equal(g!.method, "lexical");
  assert.equal(g!.needsReview, true);
  assert.ok(g!.reasons.some((r) => /predominant lexical/i.test(r)), "explicit reason for the admin");
});

test("FIX A: a clear lexical group with a confirmed shared intent does NOT need review", () => {
  const { suggestions } = generateClusterSuggestions([
    kw("book of ra deluxe", { id: "cl1", intent: "Commercial" }),
    kw("book of ra magic", { id: "cl2", intent: "Commercial" }),
    kw("book of ra classic", { id: "cl3", intent: "Commercial" }),
  ]);
  const g = suggestions.find((s) => s.keywordIds.includes("cl1"))!;
  assert.equal(g.method, "lexical");
  assert.equal(g.needsReview, false); // confirmed intent (≥2 share Commercial) → not ambiguous
  assert.ok(!g.reasons.some((r) => /predominant lexical/i.test(r)));
});

test("FIX A: does not blanket every lexical suggestion (rule is conditional)", () => {
  // Confirmed-intent group above proves at least one lexical suggestion stays needsReview=false.
  const { suggestions } = generateClusterSuggestions([
    kw("book of ra deluxe", { id: "n1", intent: "Commercial" }),
    kw("book of ra magic", { id: "n2", intent: "Commercial" }),
  ]);
  assert.ok(suggestions.some((s) => s.method === "lexical" && !s.needsReview));
});

// ── FIX C: suggestion truncation transparency ────────────────────────────────────

function nDistinctGroups(count: number) {
  const kws = [];
  for (let g = 0; g < count; g++) {
    kws.push(kw(`alfa${g} beta${g} unu`, { id: `g${g}a` }));
    kws.push(kw(`alfa${g} beta${g} doi`, { id: `g${g}b` }));
  }
  return kws;
}

test("FIX C: suggestionsTotal/suggestionsTruncated are 0 when under the cap", () => {
  const run = generateClusterSuggestions(nDistinctGroups(10));
  assert.equal(run.suggestions.length, run.suggestionsTotal);
  assert.equal(run.suggestionsTruncated, 0);
});

test("FIX C: exactly maxSuggestions → nothing truncated", () => {
  const run = generateClusterSuggestions(nDistinctGroups(200), { maxSuggestions: 200 });
  assert.equal(run.suggestions.length, 200);
  assert.equal(run.suggestionsTotal, 200);
  assert.equal(run.suggestionsTruncated, 0);
});

test("FIX C: over maxSuggestions → exact omitted count reported", () => {
  const run = generateClusterSuggestions(nDistinctGroups(250), { maxSuggestions: 200 });
  assert.equal(run.suggestions.length, 200);
  assert.equal(run.suggestionsTotal, 250);
  assert.equal(run.suggestionsTruncated, 50);
});

test("FIX C: keyword-truncation, suggestion-truncation and ungrouped are distinct fields", () => {
  // 11 keywords, cap at 5 → 6 keyword-truncated; the survivors share nothing → ungrouped, 0 suggestions.
  const kws = [];
  for (let i = 0; i < 11; i++) kws.push(kw(`unic${i} distinct${i}`, { id: `u${i}`, volume: i }));
  const run = generateClusterSuggestions(kws, { maxKeywords: 5 });
  assert.equal(run.considered, 5);
  assert.equal(run.truncated, 6); // keywords dropped by maxKeywords
  assert.equal(run.suggestionsTruncated, 0); // none dropped by maxSuggestions
  assert.equal(run.ungrouped, 5); // survivors grouped into nothing
});

// ── Performance guardrails ───────────────────────────────────────────────────────

test("Performance: respects maxKeywords cap (truncates by volume) and completes", () => {
  const kws: ClusterKeyword[] = [];
  for (let i = 0; i < 1200; i++) kws.push(kw(`slot tema ${i % 50} varianta ${i}`, { id: `g${i}`, volume: i }));
  const run = generateClusterSuggestions(kws, { maxKeywords: 500 });
  assert.equal(run.considered, 500);
  assert.equal(run.truncated, 700);
});

// Minimal suggestion factory for cannibalization tests.
function base(over: Partial<ClusterSuggestion> & Pick<ClusterSuggestion, "id" | "keywordIds" | "suggestedName">): ClusterSuggestion {
  return {
    primaryKeywordId: over.keywordIds[0],
    intent: null,
    method: "lexical",
    confidence: 50,
    needsReview: false,
    needsSerpValidation: true,
    reasons: [],
    sharedTerms: [],
    ...over,
  };
}
