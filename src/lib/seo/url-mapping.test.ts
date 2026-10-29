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
function single(id: string, phrase: string, intent: string | null = null): ClusterForMapping {
  return cluster({ id, name: phrase, intent, primaryKeyword: phrase, keywords: [kw(phrase, { id: `${id}_1` })] });
}

// Inventory covering hubs + detail pages + the two hubs that expose finding G.
const INV: UrlEntry[] = [
  entry("/", "Acasă", "home"),
  entry("/cazinouri-online", "Cazinouri online", "hub"),
  entry("/pacanele-online", "Jocuri casino", "hub"),
  entry("/furnizori", "Furnizori", "hub"),
  entry("/metode-de-plata", "Metode de plata", "hub"),
  entry("/cazinouri-online/superbet-casino", "Superbet Casino", "casino"),
  entry("/pacanele-online/book-of-ra", "Book of Ra", "game"),
];

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

test("USE_EXISTING: tight brand match to a detail page", () => {
  const [r] = recommendUrls([single("c1", "superbet casino")], INV);
  assert.equal(r.recommendation, "use_existing");
  assert.equal(r.candidates[0].url, "/cazinouri-online/superbet-casino");
});

test("EXPAND_EXISTING: good specific coverage of a hub", () => {
  const [r] = recommendUrls([single("c2", "metode plata rapida")], INV);
  assert.equal(r.recommendation, "expand_existing");
  assert.equal(r.candidates[0].url, "/metode-de-plata");
});

test("CREATE_NEW: no match → planned page with a suggested slug", () => {
  const [r] = recommendUrls([single("c3", "plinko strategie")], INV);
  assert.equal(r.recommendation, "create_new");
  assert.equal(r.suggestedSlug, "plinko-strategie");
});

test("NEEDS_REVIEW: two near-tied candidates", () => {
  const inv = [entry("/ghiduri/ruleta-europeana", "Ruleta europeana", "guide"), entry("/ghiduri/ruleta-americana", "Ruleta americana", "guide")];
  const [r] = recommendUrls([single("c4", "ruleta")], inv);
  assert.equal(r.recommendation, "needs_review");
  assert.equal(r.needsReview, true);
});

test("intent mismatch: informational cluster onto a transactional page → needsReview", () => {
  const [r] = recommendUrls([single("c5", "superbet casino", "Informational")], INV);
  assert.equal(r.recommendation, "use_existing");
  assert.equal(r.needsReview, true);
  assert.ok(/tranzac/i.test(r.explanation));
});

test("editorial protection: a confirmed mapping is never overridden", () => {
  const c = cluster({ id: "c6", primaryKeyword: "superbet casino", keywords: [
    kw("superbet bonus", { mappedUrl: "/cazinouri-online/superbet-casino", mappingStatus: "confirmed" }),
  ] });
  const [r] = recommendUrls([c], INV);
  assert.equal(r.currentStatus, "confirmed");
  assert.equal(r.currentUrl, "/cazinouri-online/superbet-casino");
  assert.ok(/păstrat/i.test(r.explanation));
  assert.equal(r.needsReview, false);
});

// ── FIX G: generic-token influence reduced, specific coverage enforced ────────────

test("FIX G: 'furnizori jocuri casino' favors /furnizori over /pacanele-online", () => {
  const [r] = recommendUrls([single("g", "furnizori jocuri casino")], INV);
  assert.equal(r.candidates[0].url, "/furnizori"); // specific 'furnizori' outranks generic 'jocuri/casino'
  assert.ok(r.candidates[0].score > (r.candidates.find((c) => c.url === "/pacanele-online")?.score ?? 0));
  assert.equal(r.recommendation, "expand_existing");
});

test("coverage: 'stergere cont superbet' stays prudent (brand-only match → needsReview)", () => {
  const [r] = recommendUrls([single("e", "stergere cont superbet")], INV);
  assert.equal(r.recommendation, "needs_review");
  assert.ok(/parțial|verifică/i.test(r.explanation));
});

test("coverage: generic-only overlap with no specific term present → needsReview", () => {
  // 'romania' is specific but no page contains it; only generic casino/online overlap exists.
  const [r] = recommendUrls([single("a", "casino online romania")], INV);
  assert.equal(r.recommendation, "needs_review");
});

test("coverage: a purely generic cluster → needsReview (no confident page)", () => {
  const [r] = recommendUrls([single("pg", "casino online jocuri")], INV);
  assert.equal(r.recommendation, "needs_review");
  assert.ok(/generic/i.test(r.explanation));
});

test("no special-casing: specific brand still maps confidently (D preserved)", () => {
  const [r] = recommendUrls([single("d", "superbet casino")], INV);
  assert.equal(r.recommendation, "use_existing");
  assert.equal(r.needsReview, false);
});

// ── cannibalization (unchanged engine) ───────────────────────────────────────────

test("cannibalization: different clusters mapped to the same URL", () => {
  const a = cluster({ id: "A", name: "A", keywords: [kw("x", { mappedUrl: "/cazinouri-online/superbet-casino" })] });
  const b = cluster({ id: "B", name: "B", keywords: [kw("y", { mappedUrl: "/cazinouri-online/superbet-casino" })] });
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
    clusterId: "E", recommendation: "use_existing", explanation: "", candidates: [{ url: "/pacanele-online/book-of-ra", title: "Book of Ra", type: "game", score: 0.9 }],
    suggestedSlug: null, needsReview: false, currentUrl: "/ghiduri/vechi", currentStatus: "confirmed",
  };
  const w = detectUrlCannibalization([cluster({ id: "E", name: "E" })], INV, [rec]);
  assert.ok(w.some((x) => x.kind === "editorial_conflict"));
});
