/**
 * SEO Keyword Clustering engine (FAZA 5.1D) — PURE, DETERMINISTIC, no deps, no I/O.
 *
 * Produces *assisted* cluster suggestions from imported keywords. It is intentionally
 * NOT autonomous and NOT AI-backed: every suggestion is a heuristic the admin reviews,
 * edits, accepts or rejects before anything is written. Nothing here mutates the DB.
 *
 * Signals (in order of trust):
 *   1. Parent Topic — Ahrefs' own topical grouping (strongest signal when present).
 *   2. Weighted lexical overlap — IDF-weighted Dice over *discriminative* tokens, so
 *      ubiquitous domain words ("casino", "online") don't by themselves create clusters.
 *   3. Search intent — never merges clearly-conflicting intents; flags ambiguity.
 *   4. Specificity — head vs long-tail spread feeds primary-keyword choice + review flag.
 *
 * IMPORTANT framing:
 *   - `confidence` is a HEURISTIC score in [0,100], NOT a statistical probability.
 *   - Cannibalization output is a PRELIMINARY heuristic warning, NOT proof. Real
 *     validation happens later via SERP Research + URL Mapping (out of scope here).
 *   - Determinism: no Date/Math.random; inputs are sorted before processing; suggestion
 *     ids are a stable hash of their member ids.
 */

// ── Public types ────────────────────────────────────────────────────────────

export interface ClusterKeyword {
  id: string;
  keyword: string; // original, as typed/imported (display)
  normalized: string; // keyword_normalized (dedup form) — tokenization basis only
  intent: string | null;
  volume: number | null;
  difficulty: number | null;
  parentTopic: string | null;
  clusterId: string | null; // already-assigned keywords are protected (never auto-moved)
  mappedUrl: string | null;
  mappingStatus: string; // none | suggested | confirmed
}

export type ClusterMethod = "parent_topic" | "lexical" | "hybrid";

export interface ClusterSuggestion {
  /** Stable id derived from sorted member ids (for selection + dedup across runs). */
  id: string;
  keywordIds: string[];
  /** Proposed primary keyword id (admin can override). */
  primaryKeywordId: string;
  /** Proposed cluster name (parent topic or primary keyword). */
  suggestedName: string;
  /** Dominant intent bucket, or null when mixed/unknown. */
  intent: string | null;
  method: ClusterMethod;
  /** Heuristic score [0,100] — NOT a probability. */
  confidence: number;
  needsReview: boolean;
  /** True when the grouping should be confirmed against real SERPs later. */
  needsSerpValidation: boolean;
  /** Human-readable reasons (RO), e.g. "Același Parent Topic". */
  reasons: string[];
  /** Discriminative tokens that drove a lexical grouping. */
  sharedTerms: string[];
}

export interface CannibalWarning {
  kind: "cluster_overlap" | "same_url" | "keyword_multi_cluster";
  message: string; // RO, heuristic
  refs: string[]; // cluster ids and/or keyword ids involved
  severity: "low" | "medium";
}

export interface PrimaryKeywordChoice {
  id: string;
  reason: string; // RO
}

export interface ClusteringConfig {
  /** df/N at or above which a token is "generic" (excluded from blocking + overlap count). */
  genericRatio: number;
  /** Absolute document-frequency floor before genericRatio applies (protects small sets). */
  minGenericDf: number;
  /** Minimum discriminative shared tokens for a lexical edge (never a single common word). */
  minSharedTokens: number;
  /** Minimum weighted-Dice similarity for a lexical edge. */
  simThreshold: number;
  /** Below this confidence a suggestion is flagged NEEDS REVIEW. */
  reviewThreshold: number;
  /** A purely-lexical group below this confidence (and without confirmed intent) needs review. */
  lexicalConfirmBand: number;
  /** Cap on a token's postings list used for pair generation (bounds O(block²)). */
  blockPairCap: number;
  /** Hard cap on keywords processed per run (larger projects are truncated by volume). */
  maxKeywords: number;
  /** Hard cap on suggestions returned. */
  maxSuggestions: number;
  /** Cluster-similarity threshold for a cannibalization overlap warning. */
  cannibalOverlap: number;
}

export const DEFAULT_CONFIG: ClusteringConfig = {
  genericRatio: 0.5,
  minGenericDf: 12,
  minSharedTokens: 2,
  simThreshold: 0.34,
  reviewThreshold: 55,
  lexicalConfirmBand: 75,
  blockPairCap: 300,
  maxKeywords: 5000,
  maxSuggestions: 200,
  cannibalOverlap: 0.6,
};

export interface SuggestionRun {
  suggestions: ClusterSuggestion[];
  warnings: CannibalWarning[];
  /** Keywords considered (after the maxKeywords cap). */
  considered: number;
  /** Keywords dropped before clustering by the maxKeywords cap (distinct from ungrouped). */
  truncated: number;
  /** Unassigned keywords that ended up in no suggestion (distinct from truncated). */
  ungrouped: number;
  /** Total groups found before the maxSuggestions cap. */
  suggestionsTotal: number;
  /** Groups omitted from the output by the maxSuggestions cap — exact (distinct from truncated/ungrouped). */
  suggestionsTruncated: number;
}

// ── Tokenization ──────────────────────────────────────────────────────────────

// Minimal RO connectives/articles only. Domain words that carry meaning in this
// vertical ("fara", "gratuite", "bonus", "depunere", "noi") are deliberately NOT here —
// their ubiquity is handled dynamically by document-frequency weighting instead.
const STOPWORDS = new Set([
  "de", "la", "cu", "si", "in", "pe", "un", "o", "din", "ce", "care", "sau", "dar",
  "al", "ale", "ai", "a", "lui", "pentru", "mai", "prin", "spre", "sub", "the", "and",
  "to", "of", "for",
]);

// Always-generic vertical words: present in almost every keyword, never discriminative.
const GENERIC_TOKENS = new Set(["casino", "casinos", "cazino", "cazinou", "cazinouri", "online"]);

/** Split the dedup-normalized keyword into meaningful tokens (len >= 2, no stopwords). */
export function tokenize(normalized: string): string[] {
  return normalized
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

// ── Intent handling ────────────────────────────────────────────────────────────

type IntentBucket = "informational" | "commercial" | "transactional" | "navigational";

const INTENT_MAP: Record<string, IntentBucket> = {
  informational: "informational", info: "informational", informatii: "informational",
  commercial: "commercial", comercial: "commercial", comparare: "commercial", compare: "commercial",
  transactional: "transactional", tranzactional: "transactional", tranzactionala: "transactional",
  buy: "transactional", cumpara: "transactional",
  navigational: "navigational", navigationala: "navigational", brand: "navigational",
};

/** Parse a possibly multi-valued intent cell ("Informational, Commercial") into buckets. */
export function intentBuckets(intent: string | null): Set<IntentBucket> {
  const out = new Set<IntentBucket>();
  if (!intent) return out;
  for (const raw of intent.toLowerCase().split(/[,/|]+/)) {
    const b = INTENT_MAP[raw.trim()];
    if (b) out.add(b);
  }
  return out;
}

/** Clearly-conflicting intents: informational vs transactional with no overlap. */
function intentsConflict(a: Set<IntentBucket>, b: Set<IntentBucket>): boolean {
  if (!a.size || !b.size) return false; // unknown intent never blocks
  for (const x of a) if (b.has(x)) return false; // any overlap → compatible
  // Disjoint buckets: treat as a conflict only for the clearest case —
  // informational on one side vs transactional on the other.
  return (
    (a.has("informational") && b.has("transactional")) ||
    (a.has("transactional") && b.has("informational"))
  );
}

/** Dominant intent for a set of keywords: the single bucket shared by all known intents, else null. */
function dominantIntent(members: ClusterKeyword[]): string | null {
  const counts = new Map<IntentBucket, number>();
  for (const m of members) for (const b of intentBuckets(m.intent)) counts.set(b, (counts.get(b) ?? 0) + 1);
  if (!counts.size) return null;
  let best: IntentBucket | null = null;
  let bestN = -1;
  // Stable: iterate in a fixed bucket order.
  for (const b of ["transactional", "commercial", "navigational", "informational"] as IntentBucket[]) {
    const n = counts.get(b) ?? 0;
    if (n > bestN) { bestN = n; best = b; }
  }
  return best;
}

// ── Similarity (IDF-weighted Dice over discriminative tokens) ───────────────────

interface Doc {
  kw: ClusterKeyword;
  tokens: string[]; // all tokens
  disc: string[]; // discriminative tokens (non-generic, non-ubiquitous)
}

function buildDocs(keywords: ClusterKeyword[], cfg: ClusteringConfig): { docs: Doc[]; weight: Map<string, number>; df: Map<string, number> } {
  const df = new Map<string, number>();
  const toks = keywords.map((kw) => tokenize(kw.normalized));
  for (const ts of toks) for (const t of new Set(ts)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = keywords.length || 1;
  const weight = new Map<string, number>();
  for (const [t, f] of df) weight.set(t, Math.log(1 + n / f)); // IDF-like, always > 0
  const isGeneric = (t: string) => {
    const f = df.get(t) ?? 0;
    return GENERIC_TOKENS.has(t) || (f >= cfg.minGenericDf && f / n >= cfg.genericRatio);
  };
  const docs: Doc[] = keywords.map((kw, i) => ({
    kw,
    tokens: toks[i],
    disc: toks[i].filter((t) => !isGeneric(t)),
  }));
  return { docs, weight, df };
}

/** Weighted Dice coefficient over shared tokens. 0..1. */
export function weightedDice(a: string[], b: string[], weight: Map<string, number>): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  let wa = 0;
  let wb = 0;
  for (const t of sa) wa += weight.get(t) ?? 1;
  for (const t of sb) wb += weight.get(t) ?? 1;
  for (const t of sa) if (sb.has(t)) inter += weight.get(t) ?? 1;
  if (wa + wb === 0) return 0;
  return (2 * inter) / (wa + wb);
}

// ── Union-Find ──────────────────────────────────────────────────────────────

class UnionFind {
  private parent: number[];
  constructor(n: number) { this.parent = Array.from({ length: n }, (_, i) => i); }
  find(x: number): number { while (this.parent[x] !== x) { this.parent[x] = this.parent[this.parent[x]]; x = this.parent[x]; } return x; }
  union(a: number, b: number): void { const ra = this.find(a); const rb = this.find(b); if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb); }
}

// ── Stable id hash (djb2) ─────────────────────────────────────────────────────

function stableId(ids: string[]): string {
  const s = [...ids].sort().join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// ── Primary keyword proposal ──────────────────────────────────────────────────

/**
 * Propose a cluster's primary keyword from a blend of signals — deliberately NOT just
 * the highest volume. Centrality (how representative the term is of the group), a
 * parent-topic match, intent fit and a head-term (shorter) bias all contribute.
 */
export function proposePrimaryKeyword(members: ClusterKeyword[], weight?: Map<string, number>): PrimaryKeywordChoice {
  if (members.length === 0) throw new Error("proposePrimaryKeyword: empty cluster");
  const w = weight ?? new Map<string, number>();
  const toks = new Map(members.map((m) => [m.id, tokenize(m.normalized)]));
  const maxVol = Math.max(1, ...members.map((m) => m.volume ?? 0));
  const domIntent = dominantIntent(members);
  const parentCounts = new Map<string, number>();
  for (const m of members) if (m.parentTopic) parentCounts.set(m.parentTopic.toLowerCase(), (parentCounts.get(m.parentTopic.toLowerCase()) ?? 0) + 1);
  const topParent = [...parentCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  const scored = members.map((m) => {
    const mt = toks.get(m.id)!;
    // Centrality: weighted overlap with every other member (representativeness).
    let centrality = 0;
    for (const o of members) if (o.id !== m.id) centrality += weightedDice(mt, toks.get(o.id)!, w);
    centrality = members.length > 1 ? centrality / (members.length - 1) : 1;
    const volNorm = (m.volume ?? 0) / maxVol;
    const parentMatch = topParent && m.parentTopic?.toLowerCase() === topParent ? 1 : 0;
    const intentFit = domIntent && intentBuckets(m.intent).has(domIntent as IntentBucket) ? 1 : 0;
    const headBias = 1 / (1 + Math.max(0, mt.length - 2)); // shorter head terms preferred, mildly
    const score = 0.34 * centrality + 0.28 * volNorm + 0.18 * parentMatch + 0.12 * intentFit + 0.08 * headBias;
    return { m, score, centrality, volNorm, parentMatch };
  });
  // Deterministic tie-break: score desc, then higher volume, then shorter, then keyword asc.
  scored.sort((a, b) =>
    b.score - a.score ||
    (b.m.volume ?? 0) - (a.m.volume ?? 0) ||
    a.m.normalized.length - b.m.normalized.length ||
    a.m.normalized.localeCompare(b.m.normalized),
  );
  const top = scored[0];
  const bits: string[] = [];
  if (top.parentMatch) bits.push("Parent Topic");
  if (top.volNorm >= 0.999) bits.push("cel mai mare volum");
  else if (top.volNorm > 0) bits.push("volum relevant");
  bits.push("reprezentativitate lexicală");
  return { id: top.m.id, reason: `Propus după ${bits.join(" + ")} (editabil manual).` };
}

// ── Confidence + reasons ──────────────────────────────────────────────────────

function scoreGroup(
  members: ClusterKeyword[],
  method: ClusterMethod,
  sharedTerms: string[],
  avgSim: number,
  cfg: ClusteringConfig,
): { confidence: number; reasons: string[]; needsReview: boolean; needsSerpValidation: boolean; intent: string | null } {
  const reasons: string[] = [];
  let conf = method === "parent_topic" ? 70 : 50;
  if (method === "hybrid") conf = 75;
  if (method === "parent_topic" || method === "hybrid") reasons.push("Același Parent Topic");
  if (sharedTerms.length) reasons.push(`Suprapunere lexicală pe termeni: ${sharedTerms.slice(0, 4).join(", ")}`);

  conf += Math.round(Math.min(25, avgSim * 35));
  if (avgSim >= 0.5) reasons.push("Suprapunere lexicală puternică");

  // Intent agreement / conflict.
  const bucketSets = members.map((m) => intentBuckets(m.intent)).filter((s) => s.size);
  let conflict = false;
  for (let i = 0; i < bucketSets.length && !conflict; i++)
    for (let j = i + 1; j < bucketSets.length; j++)
      if (intentsConflict(bucketSets[i], bucketSets[j])) { conflict = true; break; }
  const intent = dominantIntent(members);
  // Intent is "confirmed" only when ≥2 members explicitly share the same known bucket.
  const bucketCounts = new Map<IntentBucket, number>();
  for (const s of bucketSets) for (const b of s) bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
  const intentConfirmed = [...bucketCounts.values()].some((c) => c >= 2);
  if (conflict) { conf -= 25; reasons.push("Posibil conflict de intenție"); }
  else if (intentConfirmed) { conf += 8; reasons.push("Intenție de căutare similară"); }

  // Specificity spread (token-length variance) → long-tail mixed with head terms.
  const lens = members.map((m) => tokenize(m.normalized).length);
  const spread = Math.max(...lens) - Math.min(...lens);
  if (spread >= 4) reasons.push("Specificitate variată (head + long-tail)");

  conf = Math.max(0, Math.min(100, conf));
  let needsReview = conflict || conf < cfg.reviewThreshold || members.length > 25 || spread >= 5;

  // FIX A — general rule: a grouping resting PREDOMINANTLY on lexical overlap (no Parent
  // Topic corroboration) whose intent cannot be confirmed from the data, and whose lexical
  // evidence is not already strong (confidence below the confirm band), is ambiguous. Keep
  // the suggestion but require human review. Strong lexical groups (conf ≥ band) and groups
  // with a confirmed shared intent are NOT flagged, so this never blankets every lexical
  // suggestion. Parent-topic / hybrid groups are unaffected (they carry a non-lexical signal).
  if (method === "lexical" && !intentConfirmed && !conflict && conf < cfg.lexicalConfirmBand) {
    needsReview = true;
    reasons.push("Grupare predominant lexicală, fără intenție confirmată — verifică apartenența");
  }

  const needsSerpValidation = method !== "parent_topic" || conf < 75 || conflict || intent === null;
  return { confidence: conf, reasons, needsReview, needsSerpValidation, intent };
}

// ── Main: generate suggestions ──────────────────────────────────────────────────

/**
 * Generate assisted cluster suggestions over the UNASSIGNED keywords of a project.
 * Already-clustered keywords (clusterId != null) are never regrouped (editorial
 * protection). Suggestions are deduplicated (a keyword appears in at most one).
 */
export function generateClusterSuggestions(
  allKeywords: ClusterKeyword[],
  config: Partial<ClusteringConfig> = {},
): SuggestionRun {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Protect assigned keywords; only suggest over the unassigned pool.
  const assigned = allKeywords.filter((k) => k.clusterId);
  let pool = allKeywords.filter((k) => !k.clusterId);

  // Deterministic order; apply the hard cap (keep the highest-volume keywords).
  pool = [...pool].sort(
    (a, b) => (b.volume ?? 0) - (a.volume ?? 0) || a.normalized.localeCompare(b.normalized) || a.id.localeCompare(b.id),
  );
  const truncated = Math.max(0, pool.length - cfg.maxKeywords);
  if (truncated > 0) pool = pool.slice(0, cfg.maxKeywords);

  const { docs, weight } = buildDocs(pool, cfg);

  // 1) Parent-topic groups (strongest signal).
  const parentGroups = new Map<string, number[]>();
  docs.forEach((d, i) => {
    const pt = d.kw.parentTopic?.trim().toLowerCase();
    if (pt) (parentGroups.get(pt) ?? parentGroups.set(pt, []).get(pt)!).push(i);
  });
  const placed = new Set<number>(); // doc indices already in a suggestion
  const rawGroups: { members: number[]; method: ClusterMethod; shared: string[] }[] = [];
  for (const [, members] of [...parentGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (members.length < 2) continue;
    members.forEach((m) => placed.add(m));
    rawGroups.push({ members, method: "parent_topic", shared: [] });
  }

  // 2) Lexical groups via inverted-index blocking on DISCRIMINATIVE tokens (bounds cost).
  const unplaced = docs.map((_, i) => i).filter((i) => !placed.has(i));
  const uf = new UnionFind(docs.length);
  const inverted = new Map<string, number[]>();
  for (const i of unplaced) for (const t of new Set(docs[i].disc)) (inverted.get(t) ?? inverted.set(t, []).get(t)!).push(i);

  const edgeShared = new Map<string, string[]>(); // "i|j" → shared discriminative tokens
  const seenPair = new Set<string>();
  for (const [, postingsRaw] of [...inverted.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    // Cap very long postings lists (common-ish token) to bound pair generation.
    let postings = postingsRaw;
    if (postings.length > cfg.blockPairCap) {
      postings = [...postings].sort((x, y) => (docs[y].kw.volume ?? 0) - (docs[x].kw.volume ?? 0)).slice(0, cfg.blockPairCap);
    }
    for (let a = 0; a < postings.length; a++) {
      for (let b = a + 1; b < postings.length; b++) {
        const i = postings[a];
        const j = postings[b];
        const key = i < j ? `${i}|${j}` : `${j}|${i}`;
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        const shared = docs[i].disc.filter((t) => docs[j].disc.includes(t));
        const uniqShared = [...new Set(shared)];
        if (uniqShared.length < cfg.minSharedTokens) continue; // never group on a single common word
        const bi = intentBuckets(docs[i].kw.intent);
        const bj = intentBuckets(docs[j].kw.intent);
        if (intentsConflict(bi, bj)) continue; // intent protection
        const sim = weightedDice(docs[i].disc, docs[j].disc, weight);
        if (sim < cfg.simThreshold) continue;
        uf.union(i, j);
        edgeShared.set(key, uniqShared);
      }
    }
  }
  // Collect lexical components.
  const comp = new Map<number, number[]>();
  for (const i of unplaced) {
    const r = uf.find(i);
    (comp.get(r) ?? comp.set(r, []).get(r)!).push(i);
  }
  for (const [, members] of [...comp.entries()].sort((a, b) => a[0] - b[0])) {
    if (members.length < 2) continue;
    // Shared terms for the whole component = tokens common to a majority of edges.
    const termFreq = new Map<string, number>();
    for (let a = 0; a < members.length; a++)
      for (let b = a + 1; b < members.length; b++) {
        const key = members[a] < members[b] ? `${members[a]}|${members[b]}` : `${members[b]}|${members[a]}`;
        for (const t of edgeShared.get(key) ?? []) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
      }
    const shared = [...termFreq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map((e) => e[0]).slice(0, 6);
    members.forEach((m) => placed.add(m));
    rawGroups.push({ members, method: "lexical", shared });
  }

  // 3) Build suggestions (compute avg similarity, confidence, reasons, primary, name).
  const suggestions: ClusterSuggestion[] = [];
  for (const g of rawGroups) {
    const members = g.members.map((i) => docs[i].kw);
    // Promote parent-topic groups that ALSO have strong lexical cohesion to "hybrid".
    let method = g.method;
    let shared = g.shared;
    let avgSim = 0;
    { // average pairwise discriminative similarity (bounded: suggestion groups are small)
      let s = 0;
      let c = 0;
      for (let a = 0; a < g.members.length; a++)
        for (let b = a + 1; b < g.members.length; b++) {
          s += weightedDice(docs[g.members[a]].disc, docs[g.members[b]].disc, weight);
          c++;
        }
      avgSim = c ? s / c : 0;
    }
    if (method === "parent_topic" && avgSim >= cfg.simThreshold) {
      method = "hybrid";
      if (!shared.length) {
        const common = docs[g.members[0]].disc.filter((t) => g.members.every((mi) => docs[mi].disc.includes(t)));
        shared = [...new Set(common)].slice(0, 6);
      }
    }
    const { confidence, reasons, needsReview, needsSerpValidation, intent } = scoreGroup(members, method, shared, avgSim, cfg);
    const primary = proposePrimaryKeyword(members, weight);
    const primaryKw = members.find((m) => m.id === primary.id)!;
    const ptName = members.map((m) => m.parentTopic).find((p) => p && p.trim());
    const suggestedName = (method !== "lexical" && ptName ? ptName : primaryKw.keyword).trim();
    const keywordIds = members.map((m) => m.id).sort();
    suggestions.push({
      id: stableId(keywordIds),
      keywordIds,
      primaryKeywordId: primary.id,
      suggestedName,
      intent,
      method,
      confidence,
      needsReview,
      needsSerpValidation,
      reasons,
      sharedTerms: shared,
    });
  }

  // Sort suggestions: highest confidence first, stable by id; apply cap.
  suggestions.sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));
  const suggestionsTotal = suggestions.length;
  const capped = suggestions.slice(0, cfg.maxSuggestions);
  const suggestionsTruncated = suggestionsTotal - capped.length; // exact: all groups were built

  const ungrouped = unplaced.filter((i) => !placed.has(i)).length;
  const warnings = detectCannibalization(capped, assigned, pool, weight, cfg);

  return { suggestions: capped, warnings, considered: pool.length, truncated, ungrouped, suggestionsTotal, suggestionsTruncated };
}

// ── Cannibalization (PRELIMINARY heuristic warnings only) ───────────────────────

/**
 * Preliminary cannibalization signals across suggestions + existing clusters. These are
 * heuristic hints to review, NOT evidence of SEO cannibalization — real validation comes
 * from SERP Research + URL Mapping later.
 */
export function detectCannibalization(
  suggestions: ClusterSuggestion[],
  assignedKeywords: ClusterKeyword[],
  pool: ClusterKeyword[],
  weight: Map<string, number>,
  config: Partial<ClusteringConfig> = {},
): CannibalWarning[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const warnings: CannibalWarning[] = [];
  const byId = new Map<string, ClusterKeyword>([...pool, ...assignedKeywords].map((k) => [k.id, k]));

  // Token bag per suggested cluster (discriminative tokens of its members).
  const bags = suggestions.map((s) => {
    const toks = new Set<string>();
    for (const id of s.keywordIds) for (const t of tokenize(byId.get(id)?.normalized ?? "")) toks.add(t);
    return { s, toks: [...toks] };
  });

  // (a) two suggested clusters with highly similar keyword sets.
  for (let i = 0; i < bags.length; i++)
    for (let j = i + 1; j < bags.length; j++) {
      const sim = weightedDice(bags[i].toks, bags[j].toks, weight);
      if (sim >= cfg.cannibalOverlap)
        warnings.push({
          kind: "cluster_overlap",
          severity: sim >= 0.8 ? "medium" : "low",
          refs: [bags[i].s.id, bags[j].s.id],
          message: `Clustere foarte similare lexical ("${bags[i].s.suggestedName}" ↔ "${bags[j].s.suggestedName}") — verifică dacă nu țintesc aceeași intenție.`,
        });
    }

  // (b) existing assigned keywords that propose the same mapped_url across clusters.
  const urlToClusters = new Map<string, Set<string>>();
  for (const k of assignedKeywords)
    if (k.mappedUrl && k.clusterId) (urlToClusters.get(k.mappedUrl) ?? urlToClusters.set(k.mappedUrl, new Set()).get(k.mappedUrl)!).add(k.clusterId);
  for (const [url, clusters] of [...urlToClusters.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    if (clusters.size >= 2)
      warnings.push({
        kind: "same_url",
        severity: "medium",
        refs: [...clusters].sort(),
        message: `Mai multe clustere trimit la același URL (${url}) — risc de canibalizare la mapare.`,
      });

  // (c) an unassigned keyword that fits two or more suggested clusters strongly.
  for (const k of pool) {
    const kt = tokenize(k.normalized);
    const hits = bags
      .filter((bg) => bg.s.keywordIds.includes(k.id) ? false : weightedDice(kt, bg.toks, weight) >= cfg.simThreshold)
      .map((bg) => bg.s.id);
    if (hits.length >= 2)
      warnings.push({
        kind: "keyword_multi_cluster",
        severity: "low",
        refs: [k.id, ...hits.slice(0, 3)],
        message: `Keyword-ul „${k.keyword}" pare potrivit pentru mai multe clustere — decide manual unde aparține.`,
      });
  }

  // Deterministic order, and cap noise.
  warnings.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) || (b.severity.localeCompare(a.severity)) || a.message.localeCompare(b.message));
  return warnings.slice(0, 100);
}
