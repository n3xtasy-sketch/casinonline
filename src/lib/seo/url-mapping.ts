/**
 * SEO URL Mapping engine (FAZA 5.1E) — PURE, DETERMINISTIC, no deps, no I/O.
 *
 * Proposes how each keyword cluster should relate to the site's real URLs:
 *   USE_EXISTING   — a published page already matches tightly → map the cluster to it.
 *   EXPAND_EXISTING— a related page exists but doesn't fully cover the cluster → expand it.
 *   CREATE_NEW     — no good match → a NEW (planned) page is needed (slug proposed, NOT created).
 *   NEEDS_REVIEW   — ambiguous (close candidates, intent mismatch, or editorial conflict).
 *
 * It also surfaces PRELIMINARY cannibalization warnings. These are heuristics for a human to
 * review, NOT confirmed cannibalization — real validation needs SERP Research + live checks
 * (out of scope here). Nothing here mutates data or creates pages.
 */

import { tokenize, weightedDice } from "@/lib/seo/clustering";
import type { UrlEntry, UrlType } from "@/lib/db/url-inventory";

export type Recommendation = "use_existing" | "expand_existing" | "create_new" | "needs_review";

export interface MappingKeyword {
  id: string;
  keyword: string;
  normalized: string;
  mappedUrl: string | null;
  mappingStatus: string; // none | suggested | confirmed
}

export interface ClusterForMapping {
  id: string;
  name: string;
  intent: string | null;
  primaryKeyword: string | null;
  keywords: MappingKeyword[];
}

export interface UrlCandidate {
  url: string;
  title: string;
  type: UrlType;
  score: number; // 0..1 heuristic lexical match
}

export interface MappingRecommendation {
  clusterId: string;
  recommendation: Recommendation;
  explanation: string; // RO
  candidates: UrlCandidate[]; // ranked existing-page matches (top few)
  suggestedSlug: string | null; // only for create_new — a proposal, never created
  needsReview: boolean;
  /** The cluster's current mapping, derived from its keywords (editorial state). */
  currentUrl: string | null;
  currentStatus: "none" | "suggested" | "confirmed";
}

export interface UrlCannibalWarning {
  kind: "same_url_clusters" | "split_keywords" | "planned_collision" | "editorial_conflict";
  message: string; // RO, heuristic
  refs: string[]; // cluster ids / keyword ids / urls
  severity: "low" | "medium";
}

export interface MappingConfig {
  useStrong: number; // tight detail match → USE_EXISTING
  expandMin: number; // related page exists → EXPAND_EXISTING
  ambiguityMargin: number; // top-2 within this → NEEDS_REVIEW
  maxCandidates: number;
  splitSim: number; // keyword-similarity for split_keywords warning
  /** Fraction of a cluster's SPECIFIC tokens that must appear in the page, else NEEDS_REVIEW. */
  coverageMin: number;
  /** Multiplier applied to a generic token's IDF weight (supplementary down-weight signal). */
  genericFactor: number;
}

export const DEFAULT_MAPPING_CONFIG: MappingConfig = {
  useStrong: 0.6,
  expandMin: 0.34,
  ambiguityMargin: 0.08,
  maxCandidates: 5,
  splitSim: 0.5,
  coverageMin: 0.5,
  genericFactor: 0.12,
};

const DETAIL_TYPES: ReadonlySet<UrlType> = new Set(["casino", "bonus", "guide", "game", "provider", "payment"]);

// Small supplementary list of vertical category words — used ONLY to down-weight (never as
// the sole mechanism). The primary signal is IDF over the inventory. These are the words that
// appear across the whole vertical ("every page is about casinos/games/bonuses"), so sharing
// them says little about which specific page a cluster belongs to.
const GENERIC_URL_TOKENS: ReadonlySet<string> = new Set([
  "casino", "casinos", "cazino", "cazinou", "cazinouri", "online", "jocuri", "joc", "bonus", "bonusuri",
]);

const RO_DIAC: Record<string, string> = { ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t" };

/** URL slug from free text (diacritics stripped, non-alphanumerics → single dash). */
export function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[ăâîșşțţ]/g, (c) => RO_DIAC[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Tokens that represent a URL entry (title words + slug segments). */
function entryTokens(e: UrlEntry): string[] {
  const slugPart = e.url.split("/").pop() ?? "";
  return [...new Set([...tokenize(e.title.toLowerCase()), ...tokenize(slugPart.replace(/-/g, " "))])];
}

/** Tokens that represent a cluster (primary keyword + all member keywords). */
function clusterTokens(c: ClusterForMapping): string[] {
  const toks = new Set<string>();
  if (c.primaryKeyword) for (const t of tokenize(c.primaryKeyword.toLowerCase())) toks.add(t);
  for (const k of c.keywords) for (const t of tokenize(k.normalized)) toks.add(t);
  if (!toks.size && c.name) for (const t of tokenize(c.name.toLowerCase())) toks.add(t);
  return [...toks];
}

/** Derive a cluster's current mapping from its keywords: the dominant non-null mapped_url. */
export function deriveClusterMapping(c: ClusterForMapping): { url: string | null; status: "none" | "suggested" | "confirmed" } {
  const counts = new Map<string, { n: number; confirmed: boolean }>();
  for (const k of c.keywords) {
    if (!k.mappedUrl) continue;
    const e = counts.get(k.mappedUrl) ?? { n: 0, confirmed: false };
    e.n += 1;
    if (k.mappingStatus === "confirmed") e.confirmed = true;
    counts.set(k.mappedUrl, e);
  }
  if (!counts.size) return { url: null, status: "none" };
  // Dominant url: most keywords, then confirmed, then lexicographic (deterministic).
  const [url, meta] = [...counts.entries()].sort(
    (a, b) => b[1].n - a[1].n || Number(b[1].confirmed) - Number(a[1].confirmed) || a[0].localeCompare(b[0]),
  )[0];
  return { url, status: meta.confirmed ? "confirmed" : "suggested" };
}

// ── Recommendations ────────────────────────────────────────────────────────────

/** A token is "specific" (carries page-selection meaning) when it is NOT a vertical-generic word. */
function isSpecific(token: string): boolean {
  return !GENERIC_URL_TOKENS.has(token);
}

/**
 * IDF weight over the inventory corpus (primary, data-driven signal) × a generic down-weight
 * (supplementary). Rare terms (brand/entity/topic names) weigh most; ubiquitous category words
 * weigh least, so generic overlap can't by itself drive a confident recommendation.
 */
function makeWeightFn(existing: UrlEntry[], entryTok: Map<string, string[]>, cfg: MappingConfig): (t: string) => number {
  const n = existing.length || 1;
  const df = new Map<string, number>();
  for (const e of existing) for (const t of new Set(entryTok.get(e.url))) df.set(t, (df.get(t) ?? 0) + 1);
  return (t: string) => {
    const idf = Math.log(1 + n / ((df.get(t) ?? 0) + 1)); // +1 smoothing; absent (specific) terms weigh high
    return idf * (GENERIC_URL_TOKENS.has(t) ? cfg.genericFactor : 1);
  };
}

export function recommendUrls(
  clusters: ClusterForMapping[],
  inventory: UrlEntry[],
  config: Partial<MappingConfig> = {},
): MappingRecommendation[] {
  const cfg = { ...DEFAULT_MAPPING_CONFIG, ...config };
  const existing = inventory.filter((e) => e.status === "existing");
  const existingUrls = new Set(existing.map((e) => e.url));
  const entryTok = new Map(existing.map((e) => [e.url, entryTokens(e)]));
  const weightFn = makeWeightFn(existing, entryTok, cfg);
  const weight = new Map<string, number>(); // memoized weights for weightedDice
  const w = (t: string): number => { let v = weight.get(t); if (v === undefined) { v = weightFn(t); weight.set(t, v); } return v; };
  const dice = (a: string[], b: string[]) => { a.forEach(w); b.forEach(w); return weightedDice(a, b, weight); };

  return clusters
    .map((c) => {
      const cTok = clusterTokens(c);
      const specific = cTok.filter(isSpecific);
      const current = deriveClusterMapping(c);

      const ranked: UrlCandidate[] = existing
        .map((e) => ({ url: e.url, title: e.title, type: e.type, score: dice(cTok, entryTok.get(e.url)!) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
        .slice(0, cfg.maxCandidates);

      const best = ranked[0];
      const second = ranked[1];
      const intent = (c.intent ?? "").toLowerCase();
      const infoIntent = intent.includes("information");

      // Specific-term coverage: how much of the cluster's SPECIFIC vocabulary the best page represents.
      const bestTok = best ? new Set(entryTok.get(best.url)) : new Set<string>();
      const sharedSpecific = specific.filter((t) => bestTok.has(t));
      const missingSpecific = specific.filter((t) => !bestTok.has(t));
      const coverage = specific.length ? sharedSpecific.length / specific.length : 0;

      let recommendation: Recommendation;
      let explanation: string;
      let needsReview = false;
      let suggestedSlug: string | null = null;
      const pct = (x: number) => Math.round(x * 100);

      if (current.status === "confirmed") {
        // Editorial decision is sacrosanct: never overridden.
        const liveExisting = current.url ? existingUrls.has(current.url) : false;
        recommendation = liveExisting ? "use_existing" : "create_new";
        explanation = `Mapare confirmată manual (${current.url}) — păstrată, nu se suprascrie.`;
      } else if (!best) {
        recommendation = "create_new";
        suggestedSlug = slugify(c.primaryKeyword || c.name);
        explanation = "Nicio pagină existentă nu se potrivește lexical — pagină nouă (planificată).";
      } else if (specific.length === 0) {
        // The whole cluster is generic category words → can't confidently pick a page.
        recommendation = "needs_review";
        needsReview = true;
        explanation = "Keyword predominant generic (fără termeni specifici) — alege pagina manual.";
      } else if (second && best.score - second.score < cfg.ambiguityMargin && best.score >= cfg.expandMin) {
        recommendation = "needs_review";
        needsReview = true;
        explanation = `Candidați apropiați („${best.title}" ${pct(best.score)}% vs „${second.title}" ${pct(second.score)}%) — alege manual.`;
      } else if (coverage === 0) {
        // Match rests entirely on generic overlap; no specific term is represented in the page.
        recommendation = "needs_review";
        needsReview = true;
        explanation = `Potrivire bazată pe termeni generici; termenii specifici (${specific.join(", ")}) nu apar în „${best.title}" — verifică.`;
      } else if (coverage < cfg.coverageMin) {
        // Only part of the specific intent is represented (e.g. brand matches but the action doesn't).
        recommendation = "needs_review";
        needsReview = true;
        explanation = `„${best.title}" acoperă doar parțial termenii specifici (lipsesc: ${missingSpecific.join(", ")}) — verifică.`;
      } else if (best.score >= cfg.useStrong && DETAIL_TYPES.has(best.type)) {
        recommendation = "use_existing";
        explanation = `Potrivire puternică (${pct(best.score)}%) cu pagina existentă „${best.title}" (termeni: ${sharedSpecific.join(", ")}).`;
        if (infoIntent && best.type !== "guide") {
          needsReview = true;
          explanation += " Intenție informațională vs pagină tranzacțională — verifică.";
        }
      } else if (best.score >= cfg.expandMin) {
        recommendation = "expand_existing";
        explanation = `Pagină înrudită „${best.title}" (${pct(best.score)}%, termeni: ${sharedSpecific.join(", ")}) — extinde-o pentru a acoperi clusterul.`;
      } else {
        recommendation = "create_new";
        suggestedSlug = slugify(c.primaryKeyword || c.name);
        explanation = `Cea mai bună potrivire e slabă (${pct(best.score)}%) — pagină nouă (planificată).`;
      }

      return { clusterId: c.id, recommendation, explanation, candidates: ranked, suggestedSlug, needsReview, currentUrl: current.url, currentStatus: current.status };
    })
    .sort((a, b) => a.clusterId.localeCompare(b.clusterId));
}

// ── Cannibalization (PRELIMINARY heuristics) ─────────────────────────────────────

export function detectUrlCannibalization(
  clusters: ClusterForMapping[],
  inventory: UrlEntry[],
  recommendations: MappingRecommendation[],
  config: Partial<MappingConfig> = {},
): UrlCannibalWarning[] {
  const cfg = { ...DEFAULT_MAPPING_CONFIG, ...config };
  const warnings: UrlCannibalWarning[] = [];
  const nameById = new Map(clusters.map((c) => [c.id, c.name]));
  const existingUrls = new Set(inventory.filter((e) => e.status === "existing").map((e) => e.url));

  // (a) different clusters mapped to the SAME url.
  const byUrl = new Map<string, string[]>();
  for (const c of clusters) {
    const { url } = deriveClusterMapping(c);
    if (url) (byUrl.get(url) ?? byUrl.set(url, []).get(url)!).push(c.id);
  }
  for (const [url, ids] of [...byUrl.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    if (ids.length >= 2)
      warnings.push({
        kind: "same_url_clusters",
        severity: "medium",
        refs: [url, ...ids],
        message: `Mai multe clustere sunt mapate la același URL (${url}): ${ids.map((i) => `„${nameById.get(i)}"`).join(", ")}.`,
      });

  // (b) lexically-similar keywords mapped to DIFFERENT urls (across the whole project).
  const mapped = clusters.flatMap((c) => c.keywords).filter((k) => k.mappedUrl);
  const w = new Map<string, number>();
  for (let i = 0; i < mapped.length; i++)
    for (let j = i + 1; j < mapped.length; j++) {
      if (mapped[i].mappedUrl === mapped[j].mappedUrl) continue;
      const sim = weightedDice(tokenize(mapped[i].normalized), tokenize(mapped[j].normalized), w);
      if (sim >= cfg.splitSim)
        warnings.push({
          kind: "split_keywords",
          severity: "low",
          refs: [mapped[i].id, mapped[j].id],
          message: `Keyworduri similare mapate la URL-uri diferite: „${mapped[i].keyword}" (${mapped[i].mappedUrl}) vs „${mapped[j].keyword}" (${mapped[j].mappedUrl}).`,
        });
    }

  // (c) a planned/new mapping that collides with an existing published page.
  for (const r of recommendations) {
    if (r.recommendation === "create_new" && r.suggestedSlug) {
      const collision = [...existingUrls].find((u) => u.endsWith(`/${r.suggestedSlug}`));
      if (collision)
        warnings.push({
          kind: "planned_collision",
          severity: "medium",
          refs: [r.clusterId, collision],
          message: `Pagina nouă propusă pentru „${nameById.get(r.clusterId)}" (slug „${r.suggestedSlug}") se suprapune cu o pagină existentă (${collision}).`,
        });
    }
    // (d) a recommendation that diverges from a confirmed editorial mapping.
    if (r.currentStatus === "confirmed" && r.candidates[0] && r.candidates[0].url !== r.currentUrl && r.candidates[0].score >= cfg.useStrong)
      warnings.push({
        kind: "editorial_conflict",
        severity: "low",
        refs: [r.clusterId, r.currentUrl ?? "", r.candidates[0].url],
        message: `Sugestia (${r.candidates[0].url}) diferă de maparea confirmată manual (${r.currentUrl}) pentru „${nameById.get(r.clusterId)}" — decizia editorială rămâne.`,
      });
  }

  warnings.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) || b.severity.localeCompare(a.severity) || a.message.localeCompare(b.message));
  return warnings.slice(0, 100);
}
