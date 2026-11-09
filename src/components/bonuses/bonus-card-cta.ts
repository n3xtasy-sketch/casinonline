/**
 * Normalize a URL path for a robust self-link comparison: drop the hash fragment, drop the query
 * string, and strip a trailing slash (except the root). Avoids fragile exact-string comparisons.
 */
export function normalizePath(path: string): string {
  const noHash = path.split("#")[0];
  const noQuery = noHash.split("?")[0];
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery;
}

/**
 * URL-2.4: true when a card's resolved SEO destination is NOT the page it is already on. Drives both
 * the title (link vs plain text) and the secondary "Detalii bonus" link — both are a SELF-LINK when
 * `seoHref` equals `currentPath` (normalized). The affiliate "Revendică bonusul" CTA is unaffected.
 * `currentPath` is passed only where a self-link is possible (category pages); elsewhere it is
 * undefined and the card always links out.
 */
export function shouldShowDetailsLink(seoHref: string, currentPath?: string): boolean {
  return !currentPath || normalizePath(currentPath) !== normalizePath(seoHref);
}
