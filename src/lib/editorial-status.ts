/**
 * Editorial management status — pure logic for the Admin lists (flags, filters,
 * indicators, reverification rule). No DB, no React. Shared by the casino/bonus/guide
 * admin pages and unit-tested independently.
 *
 * IMPORTANT: `editorialVerifiedAt` is the EDITORIAL verification date (migration 0032),
 * NOT the Faza 2 `verified_at` (offer/operator verification). Never conflate them.
 * "No verifier" is surfaced neutrally — it does NOT mean the content is wrong.
 */

/** Default reverification window: content verified longer ago than this is flagged. */
export const REVERIFY_DAYS = 90;

export interface EditorialRow {
  authorSlug: string | null;
  verifierSlug: string | null;
  /** ISO timestamp of the editorial verification, or null. */
  editorialVerifiedAt: string | null;
}

/** What an Admin list row carries for the editorial columns (raw + resolved names). */
export interface EditorialRowView extends EditorialRow {
  /** Resolved display name from the author registry, or null (unknown/absent). */
  authorName: string | null;
  verifierName: string | null;
  /** Last content modification (updated_at), or null. */
  updatedAt: string | null;
}

export interface EditorialFlags {
  hasAuthor: boolean;
  hasVerifier: boolean;
  /** A real editorial verification = a verifier AND a verification date. */
  isVerified: boolean;
  /** Verified, but older than the reverification window. */
  needsReverify: boolean;
}

export function editorialFlags(row: EditorialRow, now: Date, reverifyDays = REVERIFY_DAYS): EditorialFlags {
  const hasAuthor = Boolean(row.authorSlug);
  const hasVerifier = Boolean(row.verifierSlug);
  const isVerified = hasVerifier && Boolean(row.editorialVerifiedAt);
  let needsReverify = false;
  if (isVerified && row.editorialVerifiedAt) {
    const ageDays = (now.getTime() - new Date(row.editorialVerifiedAt).getTime()) / 86_400_000;
    needsReverify = ageDays > reverifyDays;
  }
  return { hasAuthor, hasVerifier, isVerified, needsReverify };
}

export type EditorialFilter =
  | "all"
  | "fara-autor"
  | "fara-verificator"
  | "neverificat"
  | "reverificare";

export const EDITORIAL_FILTERS: { value: EditorialFilter; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "fara-autor", label: "Fără autor" },
  { value: "fara-verificator", label: "Fără verificator" },
  { value: "neverificat", label: "Neverificat editorial" },
  { value: "reverificare", label: "Necesită reverificare" },
];

export function parseEditorialFilter(v: string | undefined): EditorialFilter {
  return EDITORIAL_FILTERS.some((f) => f.value === v) ? (v as EditorialFilter) : "all";
}

export function matchesEditorialFilter(f: EditorialFlags, filter: EditorialFilter): boolean {
  switch (filter) {
    case "fara-autor":
      return !f.hasAuthor;
    case "fara-verificator":
      return !f.hasVerifier;
    case "neverificat":
      return !f.isVerified;
    case "reverificare":
      return f.needsReverify;
    case "all":
    default:
      return true;
  }
}

export interface EditorialSummary {
  total: number;
  faraAutor: number;
  neverificate: number;
  reverificare: number;
}

export function summarizeEditorial(flagsList: EditorialFlags[]): EditorialSummary {
  return {
    total: flagsList.length,
    faraAutor: flagsList.filter((f) => !f.hasAuthor).length,
    neverificate: flagsList.filter((f) => !f.isVerified).length,
    reverificare: flagsList.filter((f) => f.needsReverify).length,
  };
}
