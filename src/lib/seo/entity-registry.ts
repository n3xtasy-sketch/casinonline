/**
 * KE-2A Entity Registry & Resolution — PURE, DETERMINISTIC, no I/O, no AI/SERP/GSC.
 *
 * A registry DERIVED LIVE from the CMS (single source of truth — no new tables, no duplication):
 * casinos, bonuses, games, providers, payment_methods + taxonomies (bonus_types, game_categories,
 * tags). Each entity has a STABLE id based on the CMS UUID (survives slug changes), its public
 * route (if any), status, and derived aliases. The resolver maps a query/keyword to CMS entities
 * deterministically, with explicit confidence + provenance. It never invents entities, aliases or
 * URLs, and it keeps entity IDENTITY separate from whether a page is PUBLISHED (see `status`).
 *
 * Reuses the SEO normalization/tokenization (normalizeKeyword, tokenize). The vertical-generic word
 * set is kept local (clustering's GENERIC_TOKENS is private) and documented below.
 */

import { normalizeKeyword } from "@/lib/seo-research";
import { tokenize } from "@/lib/seo/clustering";

export type EntityType = "casino" | "bonus" | "game" | "provider" | "payment" | "bonus_type" | "game_category" | "tag";

/** Vertical-generic words — never discriminative on their own (mirror of clustering's private set). */
const GENERIC = new Set(["casino", "casinos", "cazino", "cazinou", "cazinouri", "online", "bonus", "bonusuri"]);
const isDiscriminative = (t: string) => t.length >= 3 && !GENERIC.has(t);

export interface EntityRecord {
  /** Stable internal id = `<type>:<cmsId>` — based on the CMS UUID, NOT the slug (survives slug renames). */
  id: string;
  type: EntityType;
  cmsId: string; // CMS primary key (uuid)
  name: string;
  slug: string;
  /** Normalized alias phrases (name, slug-as-phrase, discriminative core, separator splits). */
  aliases: string[];
  /** CMS content_status (draft/published/archived) for content entities; "taxonomy" for lookups. */
  status: string;
  /** Canonical public route for this entity, or null if the type has no 1:1 route (taxonomies).
   *  NOTE: a route path does NOT imply the page is published — check `status`. */
  publicUrl: string | null;
  provenance: "cms";
  /** Strictly-verified semantic attributes from the CMS (e.g. casino license). Never inferred. */
  attributes: Record<string, string>;
}

// ── alias derivation ────────────────────────────────────────────────────────────
function aliasesFor(name: string, slug: string): string[] {
  const out = new Set<string>();
  const nName = normalizeKeyword(name);
  if (nName) out.add(nName);
  const slugPhrase = normalizeKeyword(slug.replace(/-/g, " "));
  if (slugPhrase) out.add(slugPhrase);
  // Discriminative core: the name without vertical-generic words (e.g. "Superbet Casino" → "superbet").
  const core = tokenize(nName).filter(isDiscriminative).join(" ");
  if (core) out.add(core);
  // Separator splits: "EGT / Amusnet", "Greentube / Novomatic" → each side (brand synonyms).
  for (const part of name.split(/[/&,]|\bsi\b|\band\b/i)) {
    const p = normalizeKeyword(part);
    if (p && tokenize(p).some(isDiscriminative)) out.add(p);
  }
  return [...out].filter(Boolean);
}

// ── registry build (pure) ───────────────────────────────────────────────────────
export interface ContentRow { id: string; name: string; slug: string; status: string }
export interface BonusRow { id: string; offer: string; slug: string; status: string }
export interface TaxonomyRow { id: string; label: string; slug: string }
export interface CasinoRow extends ContentRow { license?: string | null }

export interface RegistryInput {
  casinos: CasinoRow[];
  bonuses: BonusRow[];
  games: ContentRow[];
  providers: ContentRow[];
  payments: ContentRow[];
  bonusTypes: TaxonomyRow[];
  gameCategories: TaxonomyRow[];
  tags: TaxonomyRow[];
}

const ROUTE_BASE: Partial<Record<EntityType, string>> = {
  casino: "/cazinouri-online", bonus: "/bonusuri-casino", game: "/pacanele-online",
  provider: "/furnizori", payment: "/metode-de-plata",
  // taxonomies (bonus_type/game_category/tag) have no 1:1 public route → publicUrl null
};

function record(type: EntityType, cmsId: string, name: string, slug: string, status: string, attributes: Record<string, string> = {}): EntityRecord | null {
  if (!cmsId || !name?.trim() || !slug?.trim()) return null; // never invent; skip invalid rows
  const base = ROUTE_BASE[type];
  return {
    id: `${type}:${cmsId}`,
    type,
    cmsId,
    name: name.trim(),
    slug: slug.trim(),
    aliases: aliasesFor(name, slug),
    status,
    publicUrl: base ? `${base}/${slug.trim()}` : null,
    provenance: "cms",
    attributes,
  };
}

/** Build the entity registry from CMS rows. Deterministic; skips rows with missing id/name/slug. */
export function buildEntityRegistry(input: RegistryInput): EntityRecord[] {
  const out: EntityRecord[] = [];
  for (const c of input.casinos) {
    const r = record("casino", c.id, c.name, c.slug, c.status, c.license?.trim() ? { license: c.license.trim() } : {});
    if (r) out.push(r);
  }
  for (const b of input.bonuses) { const r = record("bonus", b.id, b.offer, b.slug, b.status); if (r) out.push(r); }
  for (const g of input.games) { const r = record("game", g.id, g.name, g.slug, g.status); if (r) out.push(r); }
  for (const p of input.providers) { const r = record("provider", p.id, p.name, p.slug, p.status); if (r) out.push(r); }
  for (const p of input.payments) { const r = record("payment", p.id, p.name, p.slug, p.status); if (r) out.push(r); }
  for (const t of input.bonusTypes) { const r = record("bonus_type", t.id, t.label, t.slug, "taxonomy"); if (r) out.push(r); }
  for (const t of input.gameCategories) { const r = record("game_category", t.id, t.label, t.slug, "taxonomy"); if (r) out.push(r); }
  for (const t of input.tags) { const r = record("tag", t.id, t.label, t.slug, "taxonomy"); if (r) out.push(r); }
  return out.sort((a, b) => a.id.localeCompare(b.id)); // deterministic order
}

// ── resolution (pure) ───────────────────────────────────────────────────────────
export type MatchType = "slug_exact" | "name_exact" | "alias_exact" | "token_subset" | "overlap";
export type MatchConfidence = "high" | "medium" | "low";

export interface EntityMatch {
  entity: EntityRecord;
  matchType: MatchType;
  confidence: MatchConfidence;
  reasons: string[];
  ambiguous: boolean;
  provenance: "cms";
}

const RANK: Record<MatchType, number> = { slug_exact: 3, name_exact: 3, alias_exact: 3, token_subset: 2, overlap: 1 };
const CONF: Record<number, MatchConfidence> = { 3: "high", 2: "medium", 1: "low" };

/**
 * Resolve a free query to CMS entities. Priority: exact CMS identity/slug → exact name/alias →
 * token-subset (entity fully named in the query, with a discriminative anchor) → partial overlap
 * (low-confidence suggestion). Generic verticals ("cele mai bune cazinouri online") resolve to
 * NOTHING. Short/generic-only aliases can't match. Competing entities are flagged `ambiguous`, not
 * picked arbitrarily. Identity is independent of publish status.
 */
export function resolveEntities(query: string, registry: EntityRecord[]): EntityMatch[] {
  const q = normalizeKeyword(query ?? "");
  if (!q) return [];
  const qTokens = new Set(tokenize(q));
  if (qTokens.size === 0) return [];

  const matched: { entity: EntityRecord; matchType: MatchType; reasons: string[] }[] = [];
  for (const e of registry) {
    const slugPhrase = normalizeKeyword(e.slug.replace(/-/g, " "));
    const nName = normalizeKeyword(e.name);

    if (e.aliases.includes(q)) {
      const mt: MatchType = q === slugPhrase ? "slug_exact" : q === nName ? "name_exact" : "alias_exact";
      matched.push({ entity: e, matchType: mt, reasons: [`Potrivire exactă (${mt.replace("_", " ")}): „${q}".`] });
      continue;
    }
    // token subset: an alias is fully contained in the query AND carries a discriminative anchor.
    const subsetAlias = e.aliases.find((a) => {
      const at = tokenize(a);
      return at.length > 0 && at.some(isDiscriminative) && at.every((t) => qTokens.has(t));
    });
    if (subsetAlias) {
      matched.push({ entity: e, matchType: "token_subset", reasons: [`Entitatea „${subsetAlias}" apare integral în interogare.`] });
      continue;
    }
    // overlap: ≥1 discriminative name token shared → low-confidence suggestion.
    const shared = tokenize(nName).filter((t) => isDiscriminative(t) && qTokens.has(t));
    if (shared.length) {
      matched.push({ entity: e, matchType: "overlap", reasons: [`Suprapunere parțială pe termeni: ${shared.join(", ")} — sugestie, confirmă.`] });
    }
  }

  if (matched.length === 0) return [];
  const topRank = Math.max(...matched.map((m) => RANK[m.matchType]));
  const topCount = matched.filter((m) => RANK[m.matchType] === topRank).length;
  const ambiguousTop = topCount > 1; // ≥2 entities compete at the best tier (incl. same-alias collision)

  return matched
    .map((m) => {
      const rank = RANK[m.matchType];
      const ambiguous = rank === topRank && ambiguousTop;
      return {
        entity: m.entity,
        matchType: m.matchType,
        confidence: CONF[rank],
        reasons: ambiguous ? [...m.reasons, "Ambiguu: mai multe entități concurează — alegere manuală."] : m.reasons,
        ambiguous,
        provenance: "cms" as const,
      };
    })
    .sort((a, b) => RANK[b.matchType] - RANK[a.matchType] || a.entity.id.localeCompare(b.entity.id));
}
