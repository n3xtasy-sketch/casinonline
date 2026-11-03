/**
 * KE-1A Content Coverage Engine — PURE, DETERMINISTIC, no I/O.
 *
 * Classifies each keyword cluster against the site's URL inventory into a coverage state, reusing
 * the existing URL-mapping engine (recommendUrls / deriveClusterMapping) — NO algorithm is
 * duplicated here. Inputs are the clusters (loadClustersForMapping) and the inventory
 * (buildUrlInventory({ includeDrafts: true }) so DRAFT target pages are visible as `planned`).
 *
 * Principles:
 *   - A LEXICAL match is NOT coverage. `covered` requires an EDITORIALLY CONFIRMED mapping to a
 *     PUBLISHED page. A confirmed mapping to a DRAFT page is `planned` (page exists, not live).
 *   - The three bonus page scopes are kept distinct (general /bonusuri/<slug>, operator
 *     /cazinouri-online/<op>/<intent>, offer /bonusuri-casino/<slug>). A match onto a different
 *     scope than the cluster's generic intent is surfaced in `reasons` and lowers confidence —
 *     it is NOT silently accepted as coverage, nor silently suppressed.
 *   - Confidence is explicit; missing SERP/metrics never fabricated (metrics belong to KE-1B).
 */

import {
  recommendUrls, deriveClusterMapping,
  type ClusterForMapping, type Recommendation, type MappingConfig,
} from "@/lib/seo/url-mapping";
import { tokenize } from "@/lib/seo/clustering";
import type { UrlEntry, UrlType } from "@/lib/db/url-inventory";

export type CoverageState = "covered" | "candidate" | "planned" | "gap" | "ambiguous";
export type CoverageConfidence = "high" | "medium" | "low";
/** Architectural scope of a URL — the three distinct bonus page types + everything else. */
export type PageScope = "general" | "operator" | "offer" | "other";

export interface CoverageRow {
  clusterId: string;
  clusterName: string;
  state: CoverageState;
  confidence: CoverageConfidence;
  targetUrl: string | null;
  targetType: UrlType | null;
  targetScope: PageScope | null;
  targetStatus: "existing" | "planned" | "missing" | null;
  candidateScore: number | null; // best candidate's lexical score (0..1), when applicable
  recommendation: Recommendation | null;
  reasons: string[]; // RO, explainable
}

/** Classify a URL's scope from its path (general vs operator vs individual offer). */
export function pageScope(url: string): PageScope {
  if (/^\/cazinouri-online\/[^/]+\/[^/]+$/.test(url)) return "operator"; // /cazinouri-online/<op>/<intent>
  if (/^\/bonusuri-casino\/[^/]+$/.test(url)) return "offer"; // /bonusuri-casino/<slug>
  if (/^\/bonusuri\/[^/]+$/.test(url)) return "general"; // /bonusuri/<slug>
  return "other";
}

/** All tokens of a cluster (primary keyword + member keywords). */
function clusterTokens(c: ClusterForMapping): Set<string> {
  const toks = new Set<string>();
  for (const t of tokenize((c.primaryKeyword ?? "").toLowerCase())) toks.add(t);
  for (const k of c.keywords) for (const t of tokenize(k.normalized)) toks.add(t);
  return toks;
}

/** Slug tokens of a URL's last path segment (e.g. /cazinouri-online → ["cazinouri","online"]). */
function urlSlugTokens(url: string): string[] {
  const slug = url.split("/").filter(Boolean).pop() ?? "";
  return tokenize(slug.replace(/-/g, " "));
}

function row(
  c: ClusterForMapping,
  state: CoverageState,
  confidence: CoverageConfidence,
  targetUrl: string | null,
  targetStatus: CoverageRow["targetStatus"],
  recommendation: Recommendation | null,
  reasons: string[],
  typeOf: (u: string | null) => UrlType | null,
  candidateScore: number | null = null,
): CoverageRow {
  return {
    clusterId: c.id,
    clusterName: c.name,
    state,
    confidence,
    targetUrl,
    targetType: typeOf(targetUrl),
    targetScope: targetUrl ? pageScope(targetUrl) : null,
    targetStatus,
    candidateScore,
    recommendation,
    reasons,
  };
}

/**
 * Compute coverage for each cluster. Reuses recommendUrls twice: once against the live inventory
 * (existing-only candidates) and once with drafts promoted to `existing` so a DRAFT target page
 * is found and classified `planned` instead of a false `gap`.
 */
export function computeCoverage(
  clusters: ClusterForMapping[],
  inventory: UrlEntry[],
  config: Partial<MappingConfig> = {},
): CoverageRow[] {
  const byUrl = new Map(inventory.map((e) => [e.url, e]));
  const realStatus = (url: string | null): "existing" | "planned" | "missing" =>
    url ? (byUrl.get(url)?.status ?? "missing") : "missing";
  const typeOf = (url: string | null): UrlType | null => (url ? (byUrl.get(url)?.type ?? null) : null);

  const recExisting = new Map(recommendUrls(clusters, inventory, config).map((r) => [r.clusterId, r]));
  // Promote planned → existing so recommendUrls also ranks draft target pages.
  const allAsExisting: UrlEntry[] = inventory.map((e) => (e.status === "planned" ? { ...e, status: "existing" } : e));
  const recDrafts = new Map(recommendUrls(clusters, allAsExisting, config).map((r) => [r.clusterId, r]));

  const offerNote = "Țintă = pagină de ofertă individuală (deal specific) — nu echivalează cu acoperire pe pagina generală/operator; verifică.";
  // Listing hubs (e.g. /cazinouri-online) + their slug tokens — the canonical existing page for a
  // vertical HEAD term. Used to recognize head/listing clusters that specific-token matching misses.
  const listingHubs = inventory
    .filter((e) => e.type === "hub" && e.status === "existing")
    .map((e) => ({ url: e.url, toks: urlSlugTokens(e.url) }));

  const out = clusters.map((c): CoverageRow => {
    const recE = recExisting.get(c.id)!;
    const recD = recDrafts.get(c.id)!;
    // currentUrl/currentStatus come from deriveClusterMapping inside recommendUrls (reused). We also
    // call it directly for clarity + independence from the inventory variant.
    const current = deriveClusterMapping(c);
    const reasons: string[] = [];

    // ── 1) CONFIRMED editorial mapping — sacrosanct; determines covered/planned/ambiguous ──
    if (current.status === "confirmed" && current.url) {
      const st = realStatus(current.url);
      const scope = pageScope(current.url);
      if (scope === "offer") reasons.push(offerNote);
      if (st === "existing") {
        reasons.unshift("Mapare confirmată editorial către o pagină publicată.");
        return row(c, "covered", "high", current.url, st, recE.recommendation, reasons, typeOf);
      }
      if (st === "planned") {
        reasons.unshift("Mapare confirmată, dar pagina țintă e draft (nepublicată).");
        return row(c, "planned", "medium", current.url, st, recE.recommendation, reasons, typeOf);
      }
      reasons.unshift("Mapare confirmată către un URL inexistent în inventory — verifică (link rupt / pagină ștearsă).");
      return row(c, "ambiguous", "low", current.url, "missing", recE.recommendation, reasons, typeOf);
    }

    // ── 2) SUGGESTED (non-confirmed) mapping that already points somewhere ──
    if (current.status === "suggested" && current.url) {
      const st = realStatus(current.url);
      const scope = pageScope(current.url);
      if (st === "planned") {
        reasons.push(`Mapare sugerată către o pagină draft (${current.url}).`);
        return row(c, "planned", "medium", current.url, st, recE.recommendation, reasons, typeOf);
      }
      if (st === "existing") {
        reasons.push(`Mapare sugerată (neconfirmată) către o pagină publicată (${current.url}) — confirmă editorial.`);
        if (scope === "offer") reasons.push(offerNote);
        return row(c, "candidate", scope === "offer" ? "low" : "medium", current.url, st, recE.recommendation, reasons, typeOf);
      }
      reasons.push(`Maparea sugerată (${current.url}) nu mai există în inventory — reevaluez din potriviri.`);
    }

    // ── 3) No usable mapping → best SPECIFIC match across published + draft ──
    const best = recD.candidates[0] ?? null;
    const usable = !!best && recD.recommendation !== "create_new" && recD.recommendation !== "needs_review";
    if (usable && best) {
      const st = realStatus(best.url);
      const scope = pageScope(best.url);
      if (st === "planned") {
        reasons.push(`Pagina țintă există ca draft: ${best.url} (${recD.recommendation}, ${Math.round(best.score * 100)}%).`);
        return row(c, "planned", "medium", best.url, st, recD.recommendation, reasons, typeOf, best.score);
      }
      reasons.push(`Potrivire lexicală cu pagină publicată ${best.url} (${recD.recommendation}, ${Math.round(best.score * 100)}%) — necesită confirmare editorială.`);
      if (scope === "offer") reasons.push(offerNote);
      return row(c, "candidate", scope === "offer" ? "low" : "medium", best.url, st, recD.recommendation, reasons, typeOf, best.score);
    }

    // ── 3b) Listing-HUB head-term recognition (before gap/ambiguous). A general listing hub is the
    // canonical existing page for its vertical HEAD term; specific-token coverage structurally can't
    // match it. Recognize it as CANDIDATE (never covered, never gap) ONLY when ALL of the hub's slug
    // tokens appear in the cluster — keyed on the real slug (e.g. "cazinouri"+"online"), so an
    // operator/bonus keyword can never become a false hub candidate. ──
    const cToks = clusterTokens(c);
    const hub = listingHubs.find((h) => h.toks.length > 0 && h.toks.every((t) => cToks.has(t)));
    if (hub) {
      reasons.push(`Termen „head/listing": hub-ul general ${hub.url} acoperă verticala (termeni: ${hub.toks.join(", ")}) — confirmă editorial (potrivire pe termeni verticali, nu pe termeni specifici).`);
      const hubScore = best && best.url === hub.url ? best.score : null;
      return row(c, "candidate", "medium", hub.url, "existing", recD.recommendation, reasons, typeOf, hubScore);
    }

    // ── 3c) Otherwise: gap (no match) or ambiguous (weak/generic match) ──
    if (!best || recD.recommendation === "create_new") {
      reasons.push("Nicio pagină existentă sau draft nu se potrivește — conținut nou (gap).");
      return row(c, "gap", "medium", null, null, recD.recommendation, reasons, typeOf);
    }
    reasons.push(`Potrivire ambiguă — ${recD.explanation}`);
    return row(c, "ambiguous", "low", best.url, realStatus(best.url), recD.recommendation, reasons, typeOf, best.score);
  });

  return out.sort((a, b) => a.clusterId.localeCompare(b.clusterId));
}
