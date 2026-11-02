/**
 * Convention for casino REVIEW slugs (KE / slug standardization). PURE helper, proposed as the
 * default for NEW operators. It does NOT change the commercial display name and is NOT wired into
 * the admin create flow yet (that is a separate, approval-pending change — see the report).
 *
 * Rule:
 *   - slugify the official name (diacritics stripped, non-alphanumerics → dash);
 *   - if the slug already contains "casino" or "cazino", keep it natural (avoid doubling);
 *   - otherwise append "-casino".
 *
 * Examples: Superbet → superbet-casino · Betano → betano-casino · Vlad Cazino → vlad-cazino ·
 *           888casino → 888casino · NetBet → netbet-casino · Mr Bit → mr-bit-casino.
 */

import { slugify } from "@/lib/seo/url-mapping";

export function casinoReviewSlug(name: string): string {
  const base = slugify(name);
  if (!base) return base;
  // Natural form already carries the vertical word → do not append (idempotent on existing slugs).
  if (base.includes("casino") || base.includes("cazino")) return base;
  return `${base}-casino`;
}

/**
 * Effective slug for a NEW casino in the create flow: a non-empty manual override (normalized)
 * wins; otherwise the slug is derived from the official name via the convention. The caller still
 * validates the result against SLUG_RE and checks uniqueness.
 */
export function resolveNewCasinoSlug(manualSlug: string, name: string): string {
  const manual = manualSlug.trim().toLowerCase();
  return manual || casinoReviewSlug(name);
}
