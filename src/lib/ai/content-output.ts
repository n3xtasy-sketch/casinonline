/**
 * AI-0 Structured Output Contract + Validator — PURE, DETERMINISTIC, no I/O, no AI SDK.
 *
 * `GeneratedSection` is the shape the FUTURE model must return for one section. `validateGeneratedSection`
 * enforces the grounding rules on that output — because the prompt alone does not guarantee compliance:
 * it rejects invented internal links, unconfirmed entities, personal-experience claims, unsourced
 * numeric/percentage/license claims and keyword stuffing, and checks the structure itself. The
 * contract is section-scoped so a single section can be generated/regenerated and validated in isolation.
 */

import type { ContentPromptInput, InternalLink } from "@/lib/ai/content-prompt";

export interface FactualClaim {
  claim: string;
  sourceRef: string | null;
}

export interface GeneratedSection {
  sectionId: string;
  heading: string;
  content: string;
  keywordsUsed: string[];
  entitiesUsed: string[];
  internalLinks: string[];
  factualClaims: FactualClaim[];
  warnings: string[];
}

export interface ValidationResult {
  ok: boolean; // false when there is ≥1 error (hard grounding violation)
  errors: string[];
  warnings: string[];
}

const PERSONAL_EXPERIENCE = /\b(am|ne-am)\s+(testat|jucat|incercat|încercat|pariat|retras|depus|verificat personal)/i;
const NUMERIC_OR_LICENSE = /(\d+\s*%)|(\d[\d.,]*\s*(ron|lei|eur|€))|(licen[tț]|onjn)/i;
const STUFF_MAX_OCCURRENCES = 6;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/** Shallow structural check of a parsed model output (defensive against malformed JSON). */
function structureErrors(out: unknown): string[] {
  const e: string[] = [];
  if (typeof out !== "object" || out === null) return ["Output invalid: nu este un obiect."];
  const o = out as Record<string, unknown>;
  if (typeof o.sectionId !== "string") e.push("Camp invalid: sectionId.");
  if (typeof o.heading !== "string") e.push("Camp invalid: heading.");
  if (typeof o.content !== "string") e.push("Camp invalid: content.");
  if (!isStringArray(o.keywordsUsed)) e.push("Camp invalid: keywordsUsed.");
  if (!isStringArray(o.entitiesUsed)) e.push("Camp invalid: entitiesUsed.");
  if (!isStringArray(o.internalLinks)) e.push("Camp invalid: internalLinks.");
  if (!isStringArray(o.warnings)) e.push("Camp invalid: warnings.");
  if (!Array.isArray(o.factualClaims) || !(o.factualClaims as unknown[]).every((c) => typeof c === "object" && c !== null && typeof (c as FactualClaim).claim === "string")) {
    e.push("Camp invalid: factualClaims.");
  }
  return e;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle.trim()) return 0;
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (haystack.match(re) ?? []).length;
}

/**
 * Validate a generated section against the grounding contract + the prompt input. `ok` is false only
 * for hard violations (errors); soft issues (stuffing, unsourced-looking claims) are warnings.
 */
export function validateGeneratedSection(out: unknown, input: ContentPromptInput): ValidationResult {
  const structural = structureErrors(out);
  if (structural.length) return { ok: false, errors: structural, warnings: [] };
  const sec = out as GeneratedSection;
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1) section isolation — must answer the requested section.
  if (sec.sectionId !== input.sectionId) errors.push(`sectionId diferit: „${sec.sectionId}" ≠ „${input.sectionId}".`);

  // 2) content present.
  if (!sec.content.trim()) errors.push("Continut gol.");

  // 3) internal links ⊆ validated allowlist (no invented URLs).
  const allowedLinks = new Set((input.internalLinks ?? []).filter((l: InternalLink) => l.url.startsWith("/")).map((l) => l.url));
  for (const u of sec.internalLinks) if (!allowedLinks.has(u)) errors.push(`Link intern inexistent/inventat: ${u}.`);

  // 4) entities ⊆ confirmed (brief confirmed ∪ CMS registry) — by name or ref; no suggested/invented.
  const confirmed = new Set<string>();
  for (const e of input.brief.entities) if (e.source === "confirmed") { confirmed.add(e.name.toLowerCase()); if (e.ref) confirmed.add(e.ref.toLowerCase()); }
  for (const e of input.cmsEntities ?? []) { confirmed.add(e.name.toLowerCase()); if (e.publicUrl) confirmed.add(e.publicUrl.toLowerCase()); }
  for (const used of sec.entitiesUsed) if (!confirmed.has(used.trim().toLowerCase())) errors.push(`Entitate neconfirmata/inventata: ${used}.`);

  // 5) no claimed personal experience / unperformed manual verification.
  if (PERSONAL_EXPERIENCE.test(sec.content)) errors.push("Afirmatie de experienta personala (interzis).");

  // 6) numeric/percentage/license claims must be sourced — soft flag.
  if (NUMERIC_OR_LICENSE.test(sec.content)) {
    const sourced = sec.factualClaims.some((c) => c.sourceRef && c.sourceRef.trim());
    if (!sourced) warnings.push("Cifra/procent/licenta mentionata fara nicio factualClaim cu sursa — verifica.");
  }
  for (const c of sec.factualClaims) if (!c.sourceRef || !c.sourceRef.trim()) warnings.push(`Afirmatie factuala fara sursa: „${c.claim}".`);

  // 7) keyword stuffing — soft flag per keyword.
  const keywords = [input.brief.primaryKeyword, ...input.brief.secondaryKeywords].filter(Boolean);
  for (const k of keywords) if (countOccurrences(sec.content, k) > STUFF_MAX_OCCURRENCES) warnings.push(`Posibil keyword stuffing: „${k}".`);

  return { ok: errors.length === 0, errors, warnings };
}
