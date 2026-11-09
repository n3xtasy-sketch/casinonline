/**
 * AI-2.6 Verified CMS Fact extraction — PURE, DETERMINISTIC, no I/O, no AI SDK.
 *
 * Projects the STRUCTURED CMS columns (bonuses 0026, casinos 0024/0032) into atomic, brief-relevant
 * "facts" the model can be grounded on — the raw numeric/boolean values that AI-2.5 confirmed exist in
 * the DB but never reached the prompt. It NEVER invents a value for a missing/null column (null → no
 * fact) and it carefully distinguishes four states so a value's mere PRESENCE is not treated as proof:
 *   - "verified"  : has a verification date (verifiedAt) and is not expired;
 *   - "present"   : value exists but was not verified (no verifiedAt);
 *   - "expired"   : the offer's expiresAt is in the past — must NOT be presented as active;
 *   - sourceRef null → the fact is additionally flagged as unsourced ("fara sursa").
 *
 * IMPORTANT: `max_win` is the bonus's maximum WIN, NOT a maximum withdrawal cap (which does not exist
 * in the schema) — it is labelled explicitly so the model cannot conflate the two. The deterministic
 * sourceRef cross-check (claim ⇄ allowed source) is intentionally OUT OF SCOPE here and lands in AI-2.7.
 */

export type FactStatus = "verified" | "present" | "expired";

export interface CmsFact {
  /** Stable id: `${entityId}:${fieldKey}` (deterministic, no timestamps). */
  factId: string;
  /** Associated registry entity id: `<type>:<cmsId>`. */
  entityId: string;
  entityName: string;
  /** Human claim label (RO, no diacritics). */
  claim: string;
  /** Formatted value exactly as stored (never invented). */
  value: string;
  /** CMS column of provenance, e.g. "bonuses.wagering_multiplier". */
  field: string;
  /** Verification date (ISO yyyy-mm-dd) when the CMS recorded one, else null. */
  verifiedAt: string | null;
  /** Source reference (terms_url / license_source) when present, else null ("fara sursa"). */
  sourceRef: string | null;
  status: FactStatus;
  /** AI-2.7: the TYPED numeric value when the column is numeric (wagering/spin/max_win), else null.
   *  Enables typed numeric verification instead of fragile substring matching. */
  numericValue?: number | null;
}

// ── typed row inputs (mirror the DB columns the loader selects) ─────────────────────
export interface BonusFactRow {
  id: string;
  casinoId: string | null;
  offer: string | null;
  amount: string | null;
  wageringMultiplier: number | null;
  wageringBasis: string | null;
  isNoWagering: boolean | null;
  spinValue: number | null;
  maxWin: number | null;
  kycRequired: boolean | null;
  eligibleSlots: unknown; // jsonb (array expected)
  verifiedAt: string | null; // date
  expiresAt: string | null; // date
  termsUrl: string | null;
}

export interface CasinoFactRow {
  id: string;
  name: string | null;
  license: string | null;
  licenseVerifiedAt: string | null;
  licenseSource: string | null;
}

export interface CmsFactRows {
  bonuses: BonusFactRow[];
  casinos: CasinoFactRow[];
}

const num = (n: number): string => String(n);
const ron = (n: number): string => `${num(n)} RON`;

/** Deterministic status: expired takes precedence over verified; otherwise present. */
function statusOf(verifiedAt: string | null, expiresAt: string | null, today: string): FactStatus {
  if (expiresAt && expiresAt < today) return "expired";
  if (verifiedAt) return "verified";
  return "present";
}

function eligibleSlotsLabel(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const names = raw.map((x) => (typeof x === "string" ? x : typeof x === "object" && x && "name" in x ? String((x as { name: unknown }).name) : "")).filter(Boolean);
  if (!names.length) return null;
  const head = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${names.length} jocuri (ex: ${head})` : head;
}

/**
 * Extract every available structured fact from the given CMS rows. Only non-null/known values produce
 * a fact — missing columns are simply absent (never fabricated). `today` is injected (ISO yyyy-mm-dd)
 * so the module stays pure and testable.
 */
export function buildCmsFacts(rows: CmsFactRows, today: string): CmsFact[] {
  const out: CmsFact[] = [];

  for (const b of rows.bonuses) {
    const entityId = `bonus:${b.id}`;
    const entityName = b.offer?.trim() || `Bonus ${b.id.slice(0, 8)}`;
    const status = statusOf(b.verifiedAt, b.expiresAt, today);
    const push = (fieldKey: string, claim: string, value: string, field: string, numericValue: number | null = null) =>
      out.push({ factId: `${entityId}:${fieldKey}`, entityId, entityName, claim, value, field, verifiedAt: b.verifiedAt, sourceRef: b.termsUrl, status, numericValue });

    // Wagering: prefer the structured flag/multiplier (never the free-text `wagering` column).
    if (b.isNoWagering === true) push("wagering", "rulaj (wagering)", "fara rulaj", "bonuses.is_no_wagering", 0);
    else if (b.wageringMultiplier != null) push("wagering", "rulaj (wagering)", `${num(b.wageringMultiplier)}x${b.wageringBasis ? ` pe ${b.wageringBasis}` : ""}`, "bonuses.wagering_multiplier", b.wageringMultiplier);

    if (b.amount?.trim()) push("amount", "valoare bonus", b.amount.trim(), "bonuses.amount");
    if (b.spinValue != null) push("spin_value", "valoare rotire gratuita", ron(b.spinValue), "bonuses.spin_value", b.spinValue);
    // max_win is the maximum WIN, explicitly NOT a maximum-withdrawal cap.
    if (b.maxWin != null) push("max_win", "castig maxim din bonus (max win; NU plafon de retragere)", ron(b.maxWin), "bonuses.max_win", b.maxWin);
    if (b.kycRequired != null) push("kyc", "verificare KYC obligatorie", b.kycRequired ? "da" : "nu", "bonuses.kyc_required");
    const slots = eligibleSlotsLabel(b.eligibleSlots);
    if (slots) push("eligible_slots", "jocuri eligibile la rulaj", slots, "bonuses.eligible_slots");
    if (b.expiresAt) push("validity", "valabilitate (expira la)", b.expiresAt, "bonuses.expires_at");
  }

  for (const c of rows.casinos) {
    if (!c.license?.trim()) continue; // only the license is a structured casino fact here
    const entityId = `casino:${c.id}`;
    out.push({
      factId: `${entityId}:license`,
      entityId,
      entityName: c.name?.trim() || `Casino ${c.id.slice(0, 8)}`,
      claim: "licenta (valoare din CMS, text liber)",
      value: c.license.trim(),
      field: "casinos.license",
      verifiedAt: c.licenseVerifiedAt,
      sourceRef: c.licenseSource,
      status: statusOf(c.licenseVerifiedAt, null, today),
    });
  }

  // Deterministic order: entity, then field.
  return out.sort((a, b) => a.entityName.localeCompare(b.entityName) || a.field.localeCompare(b.field));
}

export interface ScopedFactContext {
  cmsEntities: { id: string }[];
  cmsRelations: { sourceEntityId: string; targetEntityId: string }[];
  /** AI-2.6.1: reverse-discovered entities — their facts are allowed, but they stay non-confirmed. */
  discoveredEntities?: { id: string }[];
}

/**
 * The set of entity ids whose facts are in scope: scoped CMS entities ∪ reverse-discovered entities ∪
 * endpoints of scoped relations. Single source of truth, shared by scopeCmsFacts + the diagnostic.
 */
export function factAllowedEntityIds(scoped: ScopedFactContext): Set<string> {
  const allowed = new Set<string>();
  for (const e of scoped.cmsEntities) allowed.add(e.id);
  for (const e of scoped.discoveredEntities ?? []) allowed.add(e.id);
  for (const r of scoped.cmsRelations) { allowed.add(r.sourceEntityId); allowed.add(r.targetEntityId); }
  return allowed;
}

/**
 * RELEVANCE SCOPING (PASUL 3): keep only facts whose entity is in the brief-scoped graph — a scoped CMS
 * entity, a reverse-discovered entity (AI-2.6.1), or an endpoint of a scoped relation. Avoids injecting
 * every bonus/casino in the CMS. Capped to bound input tokens (AI-2.2 discipline).
 */
export function scopeCmsFacts(
  facts: CmsFact[],
  scoped: ScopedFactContext,
  maxFacts: number,
): { facts: CmsFact[]; total: number } {
  const allowed = factAllowedEntityIds(scoped);
  const relevant = facts.filter((f) => allowed.has(f.entityId));
  return { facts: relevant.slice(0, maxFacts), total: relevant.length };
}
