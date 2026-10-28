import { test } from "node:test";
import assert from "node:assert/strict";

import {
  slugify,
  deriveClusterMapping,
  recommendUrls,
  detectUrlCannibalization,
  type ClusterForMapping,
  type MappingKeyword,
  type MappingRecommendation,
} from "@/lib/seo/url-mapping";
import type { UrlEntry } from "@/lib/db/url-inventory";

function entry(url: string, title: string, type: UrlEntry["type"], status: UrlEntry["status"] = "existing"): UrlEntry {
  return { url, title, type, source: "test", status };
}
let n = 0;
function kw(keyword: string, over: Partial<MappingKeyword> = {}): MappingKeyword {
  n += 1;
  return { id: over.id ?? `k${n}`, keyword, normalized: over.normalized ?? keyword.toLowerCase(), mappedUrl: over.mappedUrl ?? null, mappingStatus: over.mappingStatus ?? "none" };
}
function cluster(over: Partial<ClusterForMapping> & Pick<ClusterForMapping, "id">): ClusterForMapping {
  return { name: over.name ?? over.id, intent: over.intent ?? null, primaryKeyword: over.primaryKeyword ?? null, keywords: over.keywords ?? [], ...over };
}

// ── slugify / deriveClusterMapping ───────────────────────────────────────────────

test("slugify: diacritics stripped, non-alnum → dash", () => {
  assert.equal(slugify("Rotiri Gratuite fără Depunere"), "rotiri-gratuite-fara-depunere");
  assert.equal(slugify("  Book of Ra!! "), "book-of-ra");
});

test("deriveClusterMapping: dominant url + confirmed wins", () => {
  const c = cluster({ id: "c", keywords: [
    kw("a", { mappedUrl: "/x", mappingStatus: "suggested" }),
    kw("b", { mappedUrl: "/x", mappingStatus: "confirmed" }),
    kw("c", { mappedUrl: "/y", mappingStatus: "suggested" }),
  ] });
  assert.deepEqual(deriveClusterMapping(c), { url: "/x", status: "confirmed" });
  assert.deepEqual(deriveClusterMapping(cluster({ id: "e", keywords: [kw("z")] })), { url: null, status: "none" });
});

// ── recommendations ──────────────────────────────────────────────────────────────

const INV: UrlEntry[] = [
  entry("/", "Acasă", "home"),
  entry("/cazinouri-online", "Cazinouri online", "hub"),
  entry("/cazinouri-online/netbet", "NetBet", "casino"),
  entry("/jocuri-casino/book-of-ra", "Book of Ra", "game"),
];

test("USE_EXISTING: tight match to a detail page", () => {
  const c = cluster({ id: "c1", primaryKeyword: "book of ra", keywords: [kw("book of ra deluxe"), kw("book of ra gratis")] });
  const [r] = recommendUrls([c], INV);
  assert.equal(r.recommendation, "use_existing");
  assert.equal(r.candidates[0].url, "/jocuri-casino/book-of-ra");
});

test("EXPAND_EXISTING: moderate match to a related page", () => {
  const inv = [entry("/ghiduri/ruleta", "Ruleta", "guide")];
  const c = cluster({ id: "c2", primaryKeyword: "strategie ruleta", keywords: [kw("strategie ruleta avansata"), kw("sistem ruleta")] });
  const [r] = recommendUrls([c], inv);
  assert.equal(r.recommendation, "expand_existing");
});

test("CREATE_NEW: no match → planned page with a suggested slug", () => {
  const c = cluster({ id: "c3", primaryKeyword: "plinko strategie", keywords: [kw("plinko strategie")] });
  const [r] = recommendUrls([c], INV);
  assert.equal(r.recommendation, "create_new");
  assert.equal(r.suggestedSlug, "plinko-strategie");
});

test("NEEDS_REVIEW: two near-tied candidates", () => {
  const inv = [entry("/ghiduri/ruleta-europeana", "Ruleta europeana", "guide"), entry("/ghiduri/ruleta-americana", "Ruleta americana", "guide")];
  const c = cluster({ id: "c4", primaryKeyword: "ruleta", keywords: [kw("ruleta")] });
  const [r] = recommendUrls([c], inv);
  assert.equal(r.recommendation, "needs_review");
  assert.equal(r.needsReview, true);
});

test("intent mismatch: informational cluster onto a transactional page → needsReview", () => {
  const c = cluster({ id: "c5", intent: "Informational", primaryKeyword: "netbet", keywords: [kw("netbet"), kw("netbet")] });
  const [r] = recommendUrls([c], INV);
  assert.equal(r.recommendation, "use_existing");
  assert.equal(r.needsReview, true);
  assert.ok(/tranzac/i.test(r.explanation));
});

test("editorial protection: a confirmed mapping is never overridden", () => {
  const c = cluster({ id: "c6", primaryKeyword: "book of ra", keywords: [
    kw("book of ra deluxe", { mappedUrl: "/cazinouri-online/netbet", mappingStatus: "confirmed" }),
  ] });
  const [r] = recommendUrls([c], INV);
  assert.equal(r.currentStatus, "confirmed");
  assert.equal(r.currentUrl, "/cazinouri-online/netbet");
  assert.ok(/păstrat/i.test(r.explanation));
  assert.equal(r.needsReview, false);
});

// ── cannibalization ──────────────────────────────────────────────────────────────

test("cannibalization: different clusters mapped to the same URL", () => {
  const a = cluster({ id: "A", name: "A", keywords: [kw("x", { mappedUrl: "/cazinouri-online/netbet" })] });
  const b = cluster({ id: "B", name: "B", keywords: [kw("y", { mappedUrl: "/cazinouri-online/netbet" })] });
  const w = detectUrlCannibalization([a, b], INV, []);
  assert.ok(w.some((x) => x.kind === "same_url_clusters" && x.refs.includes("A") && x.refs.includes("B")));
});

test("cannibalization: similar keywords mapped to different URLs", () => {
  const c = cluster({ id: "C", name: "C", keywords: [
    kw("ruleta online", { id: "r1", mappedUrl: "/a" }),
    kw("ruleta online gratis", { id: "r2", mappedUrl: "/b" }),
  ] });
  const w = detectUrlCannibalization([c], INV, []);
  assert.ok(w.some((x) => x.kind === "split_keywords"));
});

test("cannibalization: planned (new) slug collides with an existing page", () => {
  const inv = [...INV, entry("/ghiduri/plinko", "Plinko", "guide")];
  const rec: MappingRecommendation = {
    clusterId: "P", recommendation: "create_new", explanation: "", candidates: [], suggestedSlug: "plinko", needsReview: false, currentUrl: null, currentStatus: "none",
  };
  const w = detectUrlCannibalization([cluster({ id: "P", name: "Plinko" })], inv, [rec]);
  assert.ok(w.some((x) => x.kind === "planned_collision"));
});

test("cannibalization: suggestion diverges from a confirmed editorial mapping", () => {
  const rec: MappingRecommendation = {
    clusterId: "E", recommendation: "use_existing", explanation: "", candidates: [{ url: "/jocuri-casino/book-of-ra", title: "Book of Ra", type: "game", score: 0.9 }],
    suggestedSlug: null, needsReview: false, currentUrl: "/ghiduri/vechi", currentStatus: "confirmed",
  };
  const w = detectUrlCannibalization([cluster({ id: "E", name: "E" })], INV, [rec]);
  assert.ok(w.some((x) => x.kind === "editorial_conflict"));
});
