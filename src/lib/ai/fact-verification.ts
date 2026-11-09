/**
 * AI-2.7 Deterministic sourceRef & factual-claim verification — PURE, no I/O, no AI SDK.
 *
 * AI-2.3/2.6 surfaced verified CMS facts but the validator only checked that a claim's sourceRef was
 * non-empty. This module cross-checks each factualClaim against the sources ACTUALLY passed to the
 * model and classifies it deterministically. It is honest about its limits: it does NOT attempt to
 * prove arbitrary natural-language sentences — it verifies the narrow, typed things it can (does the
 * ref exist? does it point at an expired fact? does a cited NUMBER match the typed CMS value?) and
 * routes everything else to editorial review. Numeric support uses TYPED equality on CmsFact.numericValue
 * (never fragile substring matching).
 *
 * Verdicts:
 *   - supported     : ref points at a non-expired, verified CMS fact and (if numeric) the value matches.
 *   - unverifiable  : ref is empty, OR a recognized non-fact reference (e.g. an internal link), OR a
 *                     present-but-unverified fact, OR a conceptual claim → EDITORIAL REVIEW (not an error).
 *   - invented      : ref appears in NONE of the sources given to the model → ERROR.
 *   - contradictory : ref points at a typed fact whose number the claim contradicts → ERROR.
 *   - expired       : ref points only at expired fact(s) → ERROR (must not be presented as active).
 */

import type { CmsFact } from "@/lib/ai/cms-facts";

export type ClaimVerdict = "supported" | "unverifiable" | "invented" | "contradictory" | "expired";

export interface ClaimInput {
  claim: string;
  sourceRef: string | null;
}

export interface ClaimCheck {
  claim: string;
  verdict: ClaimVerdict;
  reason?: string;
}

export interface FactualVerificationContext {
  /** The verified CMS facts passed to the model (the only things that can SUPPORT a claim). */
  cmsFacts: CmsFact[];
  /** All recognized references (fact tokens ∪ internal links ∪ entity URLs ∪ brief refs), normalized. */
  knownRefs: Set<string>;
}

const norm = (s: string): string => s.trim().toLowerCase();

/** Parse the numeric tokens from a string (typed; comma or dot decimals). */
export function extractNumbers(s: string): number[] {
  return [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => parseFloat(m[0].replace(",", "."))).filter((n) => Number.isFinite(n));
}

/** The reference tokens a model may legitimately cite for a CMS fact: its id, its column, its source URL. */
export function factualTokens(f: CmsFact): string[] {
  const t = [norm(f.factId), norm(f.field)];
  if (f.sourceRef) t.push(norm(f.sourceRef));
  return t;
}

/** Verify one factual claim against the sources given to the model. Deterministic, single verdict. */
export function verifyFactualClaim(claim: ClaimInput, ctx: FactualVerificationContext): ClaimCheck {
  const out = (verdict: ClaimVerdict, reason?: string): ClaimCheck => ({ claim: claim.claim, verdict, reason });

  const ref = claim.sourceRef?.trim();
  if (!ref) return out("unverifiable", "fara sursa — necesita review editorial");

  const token = norm(ref);
  const candidates = ctx.cmsFacts.filter((f) => factualTokens(f).includes(token));

  if (candidates.length === 0) {
    if (ctx.knownRefs.has(token)) return out("unverifiable", "referinta recunoscuta (ex. link intern) dar nu e o fapta CMS verificabila — review editorial");
    return out("invented", "sourceRef inexistent in sursele transmise modelului (inventat)");
  }

  const live = candidates.filter((f) => f.status !== "expired");
  if (live.length === 0) return out("expired", "sursa indica un fapt EXPIRAT — nu poate fi prezentat ca activ");

  const claimNums = extractNumbers(claim.claim);
  const typed = live.filter((f) => typeof f.numericValue === "number");
  if (claimNums.length && typed.length) {
    const supporting = typed.filter((f) => claimNums.includes(f.numericValue as number));
    if (supporting.length) {
      return supporting.some((f) => f.status === "verified")
        ? out("supported")
        : out("unverifiable", "valoare corecta dar neverificata (fara verifiedAt) — review editorial");
    }
    return out("contradictory", "valoarea numerica din afirmatie contrazice fapta CMS citata");
  }

  // Conceptual claim (no numbers) or a non-typed fact (text/date/boolean): we can confirm the source
  // exists but not the full sentence — supported only if the fact is verified, else editorial review.
  return live.some((f) => f.status === "verified")
    ? out("supported")
    : out("unverifiable", "sursa prezenta dar neverificata — review editorial");
}

export function verifyFactualClaims(claims: ClaimInput[], ctx: FactualVerificationContext): ClaimCheck[] {
  return claims.map((c) => verifyFactualClaim(c, ctx));
}
