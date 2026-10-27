/**
 * Pure editorial authorship logic (client-safe, no deps beyond the author registry).
 * Used by the CMS server actions (validation) and the public byline component (resolve).
 *
 * Rules honored:
 * - Author and verifier, when both set, MUST be distinct persons.
 * - A "Verificat de" byline / reviewedBy schema appears ONLY when there is a REAL
 *   editorial verification recorded: a known verifier slug AND a verified_at date.
 * - Unknown slugs are ignored on the public side (no dangling/fabricated names).
 * - No verification is invented: nothing is shown unless the data is actually present.
 */

import { authorName, isKnownAuthor } from "@/lib/authors";

/** Editorial authorship carried on a public content detail (for the byline + schema). */
export interface EditorialMeta {
  authorSlug: string | null;
  verifierSlug: string | null;
  /** ISO timestamp of the editorial verification, or null. */
  editorialVerifiedAt: string | null;
  /** Last content modification (updated_at), or null. */
  updatedAt: string | null;
}

export interface AuthorshipInput {
  authorSlug: string | null;
  verifierSlug: string | null;
  /** ISO timestamp of the editorial verification, or null. */
  verifiedAt: string | null;
}

/**
 * Validate an author/verifier assignment coming from the CMS. Returns an error message
 * (Romanian, for the admin) or null when valid. Empty/absent values are allowed
 * (assignment is optional) — this only rejects inconsistent combinations.
 */
export function validateAuthorship(input: AuthorshipInput): string | null {
  const author = input.authorSlug?.trim() || null;
  const verifier = input.verifierSlug?.trim() || null;
  const verifiedAt = input.verifiedAt?.trim() || null;

  if (author && !isKnownAuthor(author)) return "Autor necunoscut.";
  if (verifier && !isKnownAuthor(verifier)) return "Verificator necunoscut.";
  if (author && verifier && author === verifier) {
    return "Autorul si verificatorul trebuie sa fie persoane diferite.";
  }
  // A verifier only "counts" with a verification date, and a date needs a verifier.
  if (verifier && !verifiedAt) return "Adauga data verificarii pentru verificatorul selectat.";
  if (verifiedAt && !verifier) return "Selecteaza verificatorul pentru data verificarii.";
  return null;
}

/** DB column fragment written by the CMS for authorship (matches migration 0032). */
export interface AuthorshipDbRow {
  author_slug: string | null;
  verifier_slug: string | null;
  editorial_verified_at: string | null;
}

/** Parse the shared AuthorshipFields from a submitted FormData (empty → null).
 *  The date field is `editorial_verified_at` to avoid colliding with the existing
 *  Faza 2 `verified_at` field on the casino/bonus forms. */
export function parseAuthorship(formData: FormData): { input: AuthorshipInput; dbRow: AuthorshipDbRow } {
  const s = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const authorSlug = s("author_slug");
  const verifierSlug = s("verifier_slug");
  const verifiedAt = s("editorial_verified_at");
  return {
    input: { authorSlug, verifierSlug, verifiedAt },
    dbRow: { author_slug: authorSlug, verifier_slug: verifierSlug, editorial_verified_at: verifiedAt },
  };
}

export interface BylinePerson {
  slug: string;
  name: string;
  href: string;
}

export interface ResolvedByline {
  author: BylinePerson | null;
  /** Present ONLY when a real verification exists (known verifier + verifiedAt). */
  verifier: BylinePerson | null;
  verifiedAt: string | null;
  updatedAt: string | null;
  /** True if there is anything to render. */
  hasByline: boolean;
}

function person(slug: string | null): BylinePerson | null {
  const name = authorName(slug);
  if (!slug || !name) return null;
  return { slug, name, href: `/autori/${slug}` };
}

/**
 * Resolve the public byline. The verifier is returned ONLY when a verification date is
 * also present — otherwise we never display "Verificat de".
 */
export function resolveByline(input: {
  authorSlug: string | null;
  verifierSlug: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
}): ResolvedByline {
  const author = person(input.authorSlug);
  const verifiedAt = input.verifiedAt?.trim() || null;
  const verifier = verifiedAt ? person(input.verifierSlug) : null;
  const updatedAt = input.updatedAt?.trim() || null;
  return {
    author,
    verifier,
    verifiedAt: verifier ? verifiedAt : null,
    updatedAt,
    hasByline: Boolean(author || verifier || updatedAt),
  };
}
