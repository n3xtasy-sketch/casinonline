/**
 * AI-2 Content Studio — PURE UI model helpers (no React, no I/O), so the Studio's decision logic is
 * unit-testable: error classification for display, and the unsaved-changes guard that protects a
 * manual edit before a regenerate.
 */

import type { GenerationErrorKind } from "@/lib/ai/generate-section";
import type { ClaimCheck, ClaimVerdict } from "@/lib/ai/fact-verification";
import type { FactualClaim } from "@/lib/ai/content-output";

/** Short RO label + tone for an error kind, for a clear error UI. */
export function errorLabel(kind: GenerationErrorKind): { label: string; tone: "warn" | "error" } {
  switch (kind) {
    case "no_section": return { label: "Secțiune inexistentă", tone: "error" };
    case "parse_error": return { label: "Răspuns AI invalid", tone: "error" };
    case "invalid_output": return { label: "Output respins de validare", tone: "error" };
    case "max_tokens": return { label: "Răspuns trunchiat (max_tokens)", tone: "warn" };
    case "rate_limit": return { label: "Limită de cereri", tone: "warn" };
    case "timeout": return { label: "Timeout", tone: "warn" };
    case "api_error": return { label: "Eroare provider / configurare", tone: "error" };
    default: return { label: "Eroare", tone: "error" };
  }
}

/** True when the editor content differs from the last generated/applied baseline (unsaved edits). */
export function isDirty(content: string, baseline: string): boolean {
  return content !== baseline;
}

/** Whether a regenerate must ask for confirmation first (there are unsaved manual edits). */
export function needsRegenerateConfirm(content: string, baseline: string, hasResult: boolean): boolean {
  return hasResult && isDirty(content, baseline);
}

// ── AI-2.7.1 Factual Review UI model (pure) ────────────────────────────────────────
/** The three editor-facing buckets for a factual-claim verdict. */
export type ClaimGroup = "supported" | "review" | "blocked";

/** Map a verdict to its display bucket. Nothing unverified is ever shown as supported. */
export function claimGroupOf(verdict: ClaimVerdict): ClaimGroup {
  if (verdict === "supported") return "supported";
  if (verdict === "unverifiable") return "review";
  return "blocked"; // invented | contradictory | expired
}

/** Short RO label (no diacritics) for a verdict. */
export function verdictLabel(verdict: ClaimVerdict): string {
  switch (verdict) {
    case "supported": return "Sustinut de o fapta CMS verificata";
    case "unverifiable": return "Necesita verificare editoriala";
    case "invented": return "Sursa inventata";
    case "contradictory": return "Valoare contradictorie";
    case "expired": return "Fapt expirat";
    default: return "Nedeterminat";
  }
}

/** A row for the Factual Review panel — ONLY data available in the result contract (no invented fields). */
export interface FactualReviewRow {
  claim: string;
  verdict: ClaimVerdict;
  reason?: string;
  sourceRef: string | null;
  group: ClaimGroup;
}

/**
 * Pair each claimCheck (claim/verdict/reason) with its sourceRef from the parallel factualClaims array
 * (verifyFactualClaims preserves order, so index i aligns). Returns [] when there are no claim checks.
 */
export function factualReviewRows(factualClaims: FactualClaim[] | undefined, claimChecks: ClaimCheck[] | undefined | null): FactualReviewRow[] {
  return (claimChecks ?? []).map((c, i) => ({
    claim: c.claim,
    verdict: c.verdict,
    reason: c.reason,
    sourceRef: factualClaims?.[i]?.sourceRef ?? null,
    group: claimGroupOf(c.verdict),
  }));
}

/** Rows of one bucket, preserving order. */
export function rowsInGroup(rows: FactualReviewRow[], group: ClaimGroup): FactualReviewRow[] {
  return rows.filter((r) => r.group === group);
}

/** Validator messages NOT already shown per-claim in the Factual Review panel (dedupe by the claim prefix
 *  the validator uses for both claim errors and claim-review warnings). */
export const CLAIM_MESSAGE_PREFIX = "Afirmatie factuala";
export function nonClaimMessages(messages: string[] | undefined): string[] {
  return (messages ?? []).filter((m) => !m.startsWith(CLAIM_MESSAGE_PREFIX));
}
