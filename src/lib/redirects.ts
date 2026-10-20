import { isSafeInternalPath } from "@/lib/guide-format";

/** Path prefixes a redirect from_path may never target (handled elsewhere / functional). */
export const RESERVED_PREFIXES = ["/admin", "/go", "/api", "/_next"];

/** Normalize a request/stored path: drop query+hash, strip trailing slash (keep root). */
export function normalizePath(p: string): string {
  let s = (p || "").split(/[?#]/)[0].trim();
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s || "/";
}

export function isReservedPath(p: string): boolean {
  return RESERVED_PREFIXES.some((r) => p === r || p.startsWith(r + "/"));
}

/** Looks like a static asset (has a file extension in the last segment). */
export function looksLikeAsset(p: string): boolean {
  return /\.[a-z0-9]+$/i.test(p);
}

/** Valid internal redirect path (single leading slash, no control chars/backslash). */
export function isInternalRedirectPath(p: string): boolean {
  return isSafeInternalPath(p);
}

/** Result of an "is there an active redirect with <column> = <value>" check. */
export interface ActiveCheck {
  exists: boolean;
  /** Supabase/query error message, if the lookup itself failed. */
  error: string | null;
}

/**
 * Flat-graph conflict decision for a candidate `from`→`to` redirect, given a
 * checker that reports whether an active redirect exists with a column = value.
 * Pure + injectable so it is unit-testable without a DB.
 *
 * Returns a conflict message, or null when safe. A lookup ERROR is treated as a
 * BLOCKING error (never silently as "no conflict") — this is the fix for the
 * case where `to_path` is not unique and the old `.maybeSingle()` threw.
 */
export async function detectChainConflict(
  check: (column: "from_path" | "to_path", value: string) => Promise<ActiveCheck>,
  from: string,
  to: string,
): Promise<string | null> {
  // destination is already an active source → would create from → to → …
  const dest = await check("from_path", to);
  if (dest.error) return `Eroare la verificarea conflictelor de lanț: ${dest.error}`;
  if (dest.exists) return "Lanț: destinația este deja sursa unui redirect activ.";

  // source is already an active destination → would create … → from → to
  // (to_path is NOT unique, so this lookup may match multiple rows)
  const src = await check("to_path", from);
  if (src.error) return `Eroare la verificarea conflictelor de lanț: ${src.error}`;
  if (src.exists) return "Lanț: sursa este deja destinația unui redirect activ.";

  return null;
}

/** Future slug-change helper: build the 301 old→new for a given section prefix. */
export function slugRedirect(prefix: string, oldSlug: string, newSlug: string) {
  return {
    from_path: `${prefix}/${oldSlug}`,
    to_path: `${prefix}/${newSlug}`,
    status_code: 301 as const,
  };
}
