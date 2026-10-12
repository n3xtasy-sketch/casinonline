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

/** Future slug-change helper: build the 301 old→new for a given section prefix. */
export function slugRedirect(prefix: string, oldSlug: string, newSlug: string) {
  return {
    from_path: `${prefix}/${oldSlug}`,
    to_path: `${prefix}/${newSlug}`,
    status_code: 301 as const,
  };
}
