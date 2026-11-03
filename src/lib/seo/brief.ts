/**
 * SEO Brief generation engine (FAZA KE-0) — PURE, DETERMINISTIC, no deps, no I/O, NO AI.
 *
 * Turns a keyword cluster (+ its URL mapping + the real CMS entity dictionary) into a structured
 * editorial brief draft. Every value carries a provenance tag so the UI can separate editorial
 * fact from algorithmic suggestion:
 *   confirmed — an explicit editorial decision (cluster primary keyword, a CONFIRMED URL mapping)
 *               or a verified CMS source (an entity matched to a real casinos/providers/… row);
 *   suggested — a deterministic heuristic (never presented as SERP-validated — we have no SERP);
 *   manual    — typed by the editor (set later, in the CMS action, not here).
 *
 * Conservative by design: the outline is built ONLY from Parent-Topic groups with ≥2 keywords —
 * we never fabricate an H2 per keyword. When the data is too thin, the structure is left
 * incomplete and the field is flagged for editorial review (reviewFlags), rather than padded.
 *
 * Determinism: no Date/Math.random; inputs sorted before processing.
 */

import { tokenize, intentBuckets, proposePrimaryKeyword, type ClusterKeyword } from "@/lib/seo/clustering";

export type Provenance = "confirmed" | "suggested" | "manual";

export const BRIEF_FIELDS = [
  "title", "primary_keyword", "secondary_keywords", "intent", "target_url", "h1", "outline", "entities", "faq",
] as const;
export type BriefField = (typeof BRIEF_FIELDS)[number];

export interface BriefKeyword {
  id: string;
  keyword: string;
  normalized: string;
  intent: string | null;
  volume: number | null;
  parentTopic: string | null;
}

export interface OutlineItem {
  level: 2 | 3;
  heading: string;
  keywords: string[];
  note: string;
}

export interface BriefEntity {
  name: string;
  type: string; // casino | provider | game | payment | termen
  source: "confirmed" | "suggested";
  ref: string | null; // CMS url when confirmed
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** A real CMS entity (name already normalized the same way keywords are) for grounded matching. */
export interface EntityDictItem {
  name: string;
  normalized: string;
  type: string; // casino | provider | game | payment
  ref: string; // CMS url
}

export interface BriefClusterInput {
  clusterId: string | null;
  clusterName: string;
  /** Editorial primary keyword set on the cluster (→ confirmed when present). */
  clusterPrimaryKeyword: string | null;
  clusterIntent: string | null;
  keywords: BriefKeyword[];
  /** Current mapping derived from the cluster's keywords (deriveClusterMapping output). */
  mapping: { url: string | null; status: "none" | "suggested" | "confirmed" };
  /** Top deterministic URL recommendation, used only when there is no confirmed mapping. */
  recommendedUrl?: string | null;
  importIds: string[];
}

export interface BriefDraft {
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: string | null;
  targetUrl: string | null;
  h1: string;
  outline: OutlineItem[];
  entities: BriefEntity[];
  faq: FaqItem[];
  fieldProvenance: Record<BriefField, Provenance>;
  /** Fields left incomplete because the data did not support a confident value. */
  reviewFlags: BriefField[];
  sources: { clusterId: string | null; importIds: string[]; generatedFrom: "cluster" };
}

export interface BriefConfig {
  maxSecondary: number;
  maxFaq: number;
  maxSuggestedEntities: number;
}

export const DEFAULT_BRIEF_CONFIG: BriefConfig = {
  maxSecondary: 12,
  maxFaq: 8,
  maxSuggestedEntities: 6,
};

type IntentBucketName = "informational" | "commercial" | "transactional" | "navigational";

/** Dominant intent across keywords (most frequent known bucket), else null. Deterministic. */
function dominantIntent(keywords: BriefKeyword[]): string | null {
  const counts = new Map<IntentBucketName, number>();
  for (const k of keywords) for (const b of intentBuckets(k.intent)) counts.set(b as IntentBucketName, (counts.get(b as IntentBucketName) ?? 0) + 1);
  if (!counts.size) return null;
  let best: IntentBucketName | null = null;
  let bestN = -1;
  for (const b of ["transactional", "commercial", "navigational", "informational"] as IntentBucketName[]) {
    const n = counts.get(b) ?? 0;
    if (n > bestN) { bestN = n; best = b; }
  }
  return best;
}

/** Title-case a keyword for an H1 (conservative: capitalize words, no keyword stuffing). */
function toHeading(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// RO interrogatives. Checked against the RAW first word of the normalized keyword (NOT tokenize,
// which strips "ce"/"care" as stopwords). "de ce" is matched as a two-word lead.
const RO_QUESTION_WORDS = new Set(["cum", "ce", "care", "cand", "cat", "cati", "cate", "unde", "cine"]);

/** A keyword reads as a question (RO interrogative lead word, "de ce …", or an explicit "?"). */
function isQuestion(k: BriefKeyword): boolean {
  if (k.keyword.includes("?")) return true;
  const words = k.normalized.trim().split(/\s+/);
  if (words.length >= 2 && words[0] === "de" && words[1] === "ce") return true;
  return words[0] ? RO_QUESTION_WORDS.has(words[0]) : false;
}

/** All tokens of `sub` appear among the tokens of `full` (grounded entity membership). */
function tokensSubsetOf(subTokens: string[], fullTokens: Set<string>): boolean {
  return subTokens.length > 0 && subTokens.every((t) => fullTokens.has(t));
}

/**
 * Build a deterministic brief draft from a cluster. Pure — the server action persists the result
 * and sets created_by / timestamps.
 */
export function buildBriefDraft(
  input: BriefClusterInput,
  entityDict: EntityDictItem[] = [],
  config: Partial<BriefConfig> = {},
): BriefDraft {
  const cfg = { ...DEFAULT_BRIEF_CONFIG, ...config };
  const reviewFlags: BriefField[] = [];
  const provenance = {} as Record<BriefField, Provenance>;

  // Stable keyword order (volume desc, then normalized, then id) for every derivation.
  const keywords = [...input.keywords].sort(
    (a, b) => (b.volume ?? 0) - (a.volume ?? 0) || a.normalized.localeCompare(b.normalized) || a.id.localeCompare(b.id),
  );

  // ── primary keyword ──────────────────────────────────────────────────────
  let primaryKeyword = "";
  if (input.clusterPrimaryKeyword?.trim()) {
    primaryKeyword = input.clusterPrimaryKeyword.trim();
    provenance.primary_keyword = "confirmed";
  } else if (keywords.length) {
    const asCluster: ClusterKeyword[] = keywords.map((k) => ({
      id: k.id, keyword: k.keyword, normalized: k.normalized, intent: k.intent, volume: k.volume,
      difficulty: null, parentTopic: k.parentTopic, clusterId: input.clusterId, mappedUrl: null, mappingStatus: "none",
    }));
    const choice = proposePrimaryKeyword(asCluster);
    primaryKeyword = keywords.find((k) => k.id === choice.id)?.keyword ?? keywords[0].keyword;
    provenance.primary_keyword = "suggested";
  } else {
    provenance.primary_keyword = "suggested";
    reviewFlags.push("primary_keyword");
  }

  // ── secondary keywords (top by volume, minus primary) ──────────────────────
  const secondaryKeywords = keywords
    .filter((k) => k.keyword.toLowerCase() !== primaryKeyword.toLowerCase())
    .slice(0, cfg.maxSecondary)
    .map((k) => k.keyword);
  provenance.secondary_keywords = "suggested";

  // ── intent (suggested — NEVER presented as SERP-validated) ─────────────────
  const intent = input.clusterIntent?.trim() || dominantIntent(keywords);
  provenance.intent = "suggested";

  // ── target URL ─────────────────────────────────────────────────────────────
  let targetUrl: string | null;
  if (input.mapping.status === "confirmed" && input.mapping.url) {
    targetUrl = input.mapping.url;
    provenance.target_url = "confirmed";
  } else {
    targetUrl = input.recommendedUrl ?? input.mapping.url ?? null;
    provenance.target_url = "suggested";
    if (!targetUrl) reviewFlags.push("target_url");
  }

  // ── H1 + working title ─────────────────────────────────────────────────────
  const h1 = primaryKeyword ? toHeading(primaryKeyword) : "";
  provenance.h1 = "suggested";
  if (!h1) reviewFlags.push("h1");
  const title = primaryKeyword ? toHeading(primaryKeyword) : input.clusterName;
  provenance.title = "suggested";

  // ── outline: ONLY Parent-Topic groups with ≥2 keywords (conservative) ──────
  const parentGroups = new Map<string, { label: string; kws: BriefKeyword[] }>();
  for (const k of keywords) {
    const pt = k.parentTopic?.trim();
    if (!pt) continue;
    const key = pt.toLowerCase();
    const g = parentGroups.get(key) ?? { label: pt, kws: [] };
    g.kws.push(k);
    parentGroups.set(key, g);
  }
  const outline: OutlineItem[] = [...parentGroups.values()]
    .filter((g) => g.kws.length >= 2)
    .sort((a, b) => b.kws.length - a.kws.length || a.label.localeCompare(b.label))
    .map((g) => ({ level: 2 as const, heading: toHeading(g.label), keywords: g.kws.map((k) => k.keyword), note: "" }));
  provenance.outline = "suggested";
  if (!outline.length) reviewFlags.push("outline"); // insufficient data → editorial review

  // ── entities: CONFIRMED from CMS matches; SUGGESTED from lexical terms ──────
  const entities: BriefEntity[] = [];
  const seenEntity = new Set<string>();
  const keywordTokenSets = keywords.map((k) => new Set(tokenize(k.normalized)));
  // Confirmed: a real CMS entity whose (normalized) name tokens are a subset of some keyword.
  for (const e of [...entityDict].sort((a, b) => a.normalized.localeCompare(b.normalized))) {
    const eTokens = tokenize(e.normalized);
    const matched = keywordTokenSets.some((ks) => tokensSubsetOf(eTokens, ks));
    if (matched && !seenEntity.has(e.ref)) {
      seenEntity.add(e.ref);
      entities.push({ name: e.name, type: e.type, source: "confirmed", ref: e.ref });
    }
  }
  // Suggested: discriminative tokens (df ≥ 2) not already a confirmed entity — clearly flagged.
  const confirmedTokens = new Set<string>();
  for (const e of entities) for (const t of tokenize(e.name.toLowerCase())) confirmedTokens.add(t);
  const df = new Map<string, number>();
  for (const ks of keywordTokenSets) for (const t of ks) df.set(t, (df.get(t) ?? 0) + 1);
  const suggestedTerms = [...df.entries()]
    .filter(([t, f]) => f >= 2 && !confirmedTokens.has(t))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cfg.maxSuggestedEntities)
    .map(([t]) => t);
  for (const t of suggestedTerms) {
    if (seenEntity.has(`term:${t}`)) continue;
    seenEntity.add(`term:${t}`);
    entities.push({ name: t, type: "termen", source: "suggested", ref: null });
  }
  provenance.entities = "suggested";

  // ── FAQ: question-form keywords only (answers left for the editor) ─────────
  const faq: FaqItem[] = [];
  const seenQ = new Set<string>();
  for (const k of keywords) {
    if (!isQuestion(k)) continue;
    const q = toHeading(k.keyword).replace(/\?*$/, "") + "?";
    const key = q.toLowerCase();
    if (seenQ.has(key)) continue;
    seenQ.add(key);
    faq.push({ question: q, answer: "" });
    if (faq.length >= cfg.maxFaq) break;
  }
  provenance.faq = "suggested";

  return {
    title,
    primaryKeyword,
    secondaryKeywords,
    intent,
    targetUrl,
    h1,
    outline,
    entities,
    faq,
    fieldProvenance: provenance,
    reviewFlags,
    sources: { clusterId: input.clusterId, importIds: [...new Set(input.importIds)].sort(), generatedFrom: "cluster" },
  };
}

/** The persisted editable value set of a brief (snake-free, engine-facing). */
export interface BriefValues {
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: string | null;
  targetUrl: string | null;
  h1: string;
  outline: OutlineItem[];
  entities: BriefEntity[];
  faq: FaqItem[];
}

/**
 * Union-merge the entity list on REGENERATE (KE-2C protection fix). Existing entities are preserved
 * FIRST (so editor-confirmed CMS entities and manually-added ones are never dropped), fresh entities
 * are appended, and duplicates are removed. This replaces the previous overwrite behaviour, which
 * silently discarded confirmed/manual entities whenever the `entities` field was not locked (the
 * field's provenance is always 'suggested'). Backward-compatible: operates on the stored
 * BriefEntity[] shape; no schema change.
 *
 * Identity is (normalized name + type), NOT the ref. Refs are slug-based (/cazinouri-online/<slug>),
 * so keying on ref would make a casino's slug rename produce a DUPLICATE on regenerate (old-ref row
 * + new-ref row for the same entity). Keying on name+type keeps a single row (existing wins, so its
 * confirmed/manual source survives). Trade-off: two genuinely distinct entities sharing an identical
 * name AND type would collapse — rare for CMS rows and acceptable vs. silent duplication.
 */
export function mergeEntityLists(existing: BriefEntity[], fresh: BriefEntity[]): BriefEntity[] {
  const key = (e: BriefEntity) => `${e.name.trim().toLowerCase()}|${e.type}`;
  const out: BriefEntity[] = [];
  const seen = new Set<string>();
  for (const e of [...existing, ...fresh]) {
    const k = key(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

/**
 * Merge a freshly-generated draft into an existing brief on REGENERATE. A field is PRESERVED when
 * it is locked (editor-controlled) OR its current provenance is 'manual' or 'confirmed'; otherwise
 * it is refreshed from the new suggestion. The `entities` field is special-cased: unless fully
 * preserved (locked/manual/confirmed) it is UNION-merged (KE-2C) so confirmed/manual entities
 * survive regeneration rather than being overwritten. Returns merged values + provenance.
 * Deterministic.
 */
export function mergeBriefDraft(
  existing: BriefValues & { fieldProvenance: Record<string, Provenance> },
  fresh: BriefDraft,
  lockedFields: string[],
): { values: BriefValues; fieldProvenance: Record<BriefField, Provenance> } {
  const locked = new Set(lockedFields);
  const keep = (f: BriefField): boolean =>
    locked.has(f) || existing.fieldProvenance[f] === "manual" || existing.fieldProvenance[f] === "confirmed";

  const prov = {} as Record<BriefField, Provenance>;
  const pick = <K extends keyof BriefValues>(field: BriefField, key: K): BriefValues[K] => {
    if (keep(field)) { prov[field] = existing.fieldProvenance[field] ?? "manual"; return existing[key]; }
    prov[field] = fresh.fieldProvenance[field] ?? "suggested";
    return fresh[key as unknown as keyof BriefDraft] as unknown as BriefValues[K];
  };

  // entities: preserve fully when locked/manual/confirmed; otherwise union-merge (never overwrite).
  let entities: BriefEntity[];
  if (keep("entities")) {
    entities = existing.entities;
    prov.entities = existing.fieldProvenance.entities ?? "manual";
  } else {
    entities = mergeEntityLists(existing.entities, fresh.entities);
    prov.entities = existing.fieldProvenance.entities ?? fresh.fieldProvenance.entities ?? "suggested";
  }

  const values: BriefValues = {
    title: pick("title", "title"),
    primaryKeyword: pick("primary_keyword", "primaryKeyword"),
    secondaryKeywords: pick("secondary_keywords", "secondaryKeywords"),
    intent: pick("intent", "intent"),
    targetUrl: pick("target_url", "targetUrl"),
    h1: pick("h1", "h1"),
    outline: pick("outline", "outline"),
    entities,
    faq: pick("faq", "faq"),
  };
  return { values, fieldProvenance: prov };
}
