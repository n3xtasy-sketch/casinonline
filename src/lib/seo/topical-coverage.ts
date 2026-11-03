/**
 * KE-2B Topical Coverage Engine — PURE, DETERMINISTIC, no I/O, no AI/SERP/GSC.
 *
 * SEPARATE from the KE-1A Coverage Engine (which scores keyword CLUSTERS against the URL inventory).
 * This engine answers a different question: for each entity RELATION (KE-2B) — e.g. "Superbet accepts
 * Skrill", "Superbet offers a no-deposit bonus" — is that topic EXPLICITLY covered by published
 * editorial content, and what should the editor do about it?
 *
 * Hard rules (do not break):
 *   - A verified DB relation is NOT editorial content. It never auto-promotes to `covered`.
 *   - A published page being "about" an entity does NOT prove every relation of that entity is
 *     explained on it. Section-type relations (payment/game/tag/license) can reach `candidate` at
 *     most — never `covered` — because we have no content-level evidence in this phase.
 *   - `covered` requires EXPLICIT structural evidence of a published page dedicated to the topic:
 *     the offer's own page, or an operator evergreen page whose slug names the topic.
 *   - No SERP/GSC/demand signals exist here. Without distinct-intent + demand evidence we NEVER
 *     emit `consider_new_page`; we prefer expand_section / review_existing / investigate (no thin
 *     content). `consider_new_page` is reserved for a future KE-1-opportunity-driven caller.
 */

import { pageScope, type PageScope } from "@/lib/seo/coverage";
import { tokenize } from "@/lib/seo/clustering";
import type { EntityRecord } from "@/lib/seo/entity-registry";
import type { EntityRelation, RelationType } from "@/lib/seo/entity-relations";
import type { UrlEntry } from "@/lib/db/url-inventory";

export type TopicalState = "covered" | "candidate" | "planned" | "identified" | "gap" | "ambiguous";
export type EditorialAction = "review_existing" | "expand_section" | "publish_draft" | "consider_new_page" | "investigate";

export interface TopicalRow {
  relation: EntityRelation;
  sourceEntityId: string;
  targetEntityId: string;
  state: TopicalState;
  editorialAction: EditorialAction;
  /** Canonical dedicated page for this topic, if the architecture defines one AND it was found. */
  dedicatedUrl: string | null;
  dedicatedScope: PageScope | null;
  reasons: string[]; // RO, explainable
}

type UrlStatus = "existing" | "planned" | "missing";

/** Relations that are inherently a SECTION of a container page (no 1:1 dedicated route exists). */
const SECTION_TYPES: ReadonlySet<RelationType> = new Set<RelationType>([
  "casino_payment", "casino_game", "casino_tag", "casino_license", "game_provider", "bonus_bonus_type",
]);

function slugTokens(e: EntityRecord): Set<string> {
  const toks = new Set<string>();
  for (const t of tokenize(e.slug.replace(/-/g, " "))) toks.add(t);
  for (const t of tokenize(e.name.toLowerCase())) toks.add(t);
  return toks;
}
/** Last path segment tokens of a URL (e.g. /cazinouri-online/x/bonus-fara-depunere → bonus,fara,depunere). */
function lastSegmentTokens(url: string): Set<string> {
  const seg = url.split("/").filter(Boolean).pop() ?? "";
  return new Set(tokenize(seg.replace(/-/g, " ")));
}

function mk(
  relation: EntityRelation, state: TopicalState, editorialAction: EditorialAction,
  dedicatedUrl: string | null, reasons: string[],
): TopicalRow {
  return {
    relation,
    sourceEntityId: relation.sourceEntityId,
    targetEntityId: relation.targetEntityId,
    state,
    editorialAction,
    dedicatedUrl,
    dedicatedScope: dedicatedUrl ? pageScope(dedicatedUrl) : null,
    reasons,
  };
}

/**
 * Compute topical coverage for each relation. `entityById` is the KE-2A registry keyed by id;
 * `inventory` should be buildUrlInventory({ includeDrafts: true }) so draft target pages are seen.
 */
export function topicalCoverage(
  relations: EntityRelation[],
  entityById: Map<string, EntityRecord>,
  inventory: UrlEntry[],
): TopicalRow[] {
  const byUrl = new Map(inventory.map((e) => [e.url, e] as const));
  const statusOf = (url: string | null): UrlStatus => (url ? (byUrl.get(url)?.status ?? "missing") : "missing");

  const out = relations.map((rel): TopicalRow => {
    const source = entityById.get(rel.sourceEntityId) ?? null;
    const isLicense = rel.relationType === "casino_license";
    const target = isLicense ? null : entityById.get(rel.targetEntityId) ?? null;

    // Orphan references → ambiguous (insufficient data), never a fabricated coverage claim.
    if (!source) return mk(rel, "ambiguous", "investigate", null, ["Entitate sursă absentă în registry (referință orfană)."]);
    if (!isLicense && !target) return mk(rel, "ambiguous", "investigate", null, ["Entitate țintă absentă în registry (referință orfană)."]);

    // ── 1) Individual OFFER (casino → bonus): the offer's own page is explicit evidence. ──
    if (rel.relationType === "casino_bonus") {
      const url = target!.publicUrl;
      const st = statusOf(url);
      if (st === "existing") return mk(rel, "covered", "review_existing", url, [`Oferta are pagină proprie publicată (${url}) — verifică actualitatea.`]);
      if (st === "planned") return mk(rel, "planned", "publish_draft", url, [`Pagina ofertei există ca draft (${url}).`]);
      return mk(rel, "identified", "investigate", null, ["Relație verificată (casino→bonus), dar oferta nu are pagină în inventory."]);
    }

    // ── 2) OPERATOR evergreen topic (casino → bonus_type): dedicated page = /cazinouri-online/<op>/<intent>
    //       recognized structurally (segment slug names the topic). ──
    if (rel.relationType === "casino_bonus_type") {
      const casinoBase = source.publicUrl; // /cazinouri-online/<slug>
      const topic = slugTokens(target!);
      const matches = casinoBase
        ? inventory.filter((e) =>
            pageScope(e.url) === "operator" &&
            e.url.startsWith(`${casinoBase}/`) &&
            topic.size > 0 &&
            [...topic].every((t) => lastSegmentTokens(e.url).has(t)),
          )
        : [];
      if (matches.length > 1) {
        return mk(rel, "ambiguous", "investigate", null, [`Mai multe pagini operator par să acopere topicul (${matches.map((m) => m.url).join(", ")}) — clarifică.`]);
      }
      if (matches.length === 1) {
        const m = matches[0];
        if (m.status === "existing") return mk(rel, "covered", "review_existing", m.url, [`Pagină evergreen operator publicată, dedicată topicului (${m.url}).`]);
        return mk(rel, "planned", "publish_draft", m.url, [`Pagină evergreen operator în draft pentru topic (${m.url}).`]);
      }
      // No dedicated operator page. Prefer folding into the published review (no demand → no new page).
      const reviewSt = statusOf(casinoBase);
      if (reviewSt === "existing") return mk(rel, "candidate", "expand_section", null, [`Recenzia operatorului e publicată (${casinoBase}); topicul „${target!.name}" poate fi o secțiune — fără dovadă că e deja tratat.`]);
      return mk(rel, "gap", "investigate", null, [`Topic relevant (casino oferă „${target!.name}") fără pagină dedicată și fără recenzie publicată; fără semnal de cerere nu se creează pagină automat.`]);
    }

    // ── 3) SECTION / ATTRIBUTE topics (payment/game/tag/license/provider/bonus-type-of-bonus):
    //       no dedicated route. Evidence ceiling = `candidate` (never `covered`). ──
    if (SECTION_TYPES.has(rel.relationType)) {
      // Anchor = the container entity page that would host this as a section.
      const anchor = source.publicUrl; // casino review / game page / bonus page
      const st = statusOf(anchor);
      const label = isLicense ? `licență ${rel.targetEntityId.replace("license:", "").toUpperCase()}` : `„${target!.name}"`;
      if (st === "existing") {
        return mk(rel, "candidate", "expand_section", null, [`Relație verificată; pagina container e publicată (${anchor}). ${label} poate fi o secțiune — fără dovadă explicită că e acoperit.`]);
      }
      if (st === "planned") {
        return mk(rel, "identified", "investigate", null, [`Relație verificată; pagina container (${anchor}) e draft — publică întâi containerul.`]);
      }
      return mk(rel, "identified", "investigate", null, [`Relație verificată (${rel.relationType}) pentru ${label}, dar nu există pagină container identificată.`]);
    }

    // Fallback (should not happen) — never fabricate coverage.
    return mk(rel, "identified", "investigate", null, ["Tip de relație netratat — investigație manuală."]);
  });

  return out.sort(
    (a, b) =>
      a.sourceEntityId.localeCompare(b.sourceEntityId) ||
      a.relation.relationType.localeCompare(b.relation.relationType) ||
      a.targetEntityId.localeCompare(b.targetEntityId),
  );
}
