/**
 * Casino review slug standardization (→ `-casino` suffix). PURE data + builder, ZERO imports so
 * it is safe to load from next.config.ts. Nothing here touches the DB; the actual slug values are
 * changed by a one-time data UPDATE (see the prepared SQL), and these 308 redirects keep the old
 * review URLs alive afterwards.
 *
 * Only operators whose slug genuinely changes are listed. 888casino (already contains "casino")
 * and vlad-cazino (natural "cazino" form) are intentionally NOT redirected — no redirect to an
 * unchanged/non-existent destination.
 */

export interface SlugRename {
  from: string; // old slug (bare)
  to: string; // new slug (-casino)
}

export const CASINO_SLUG_RENAMES: readonly SlugRename[] = [
  { from: "betano", to: "betano-casino" },
  { from: "maxbet", to: "maxbet-casino" },
  { from: "mr-bit", to: "mr-bit-casino" },
  { from: "netbet", to: "netbet-casino" },
  { from: "superbet", to: "superbet-casino" },
  { from: "unibet", to: "unibet-casino" },
  { from: "winmasters", to: "winmasters-casino" },
  { from: "winner", to: "winner-casino" },
];

const BASE = "/cazinouri-online";

export interface NextRedirect {
  source: string;
  destination: string;
  permanent: boolean; // true → Next emits HTTP 308
}

/**
 * Permanent (308) redirects old→new for every renamed operator:
 *   - the exact review page:   /cazinouri-online/betano            → …/betano-casino
 *   - any child path (≥1 seg): /cazinouri-online/betano/:path+     → …/betano-casino/:path+
 *
 * `:path+` (one-or-more) keeps parent and child disjoint (no double match). Every destination is a
 * `-casino` slug and no source is a `-casino` slug, so there are NO chains and NO loops.
 */
export function casinoSlugRedirects(): NextRedirect[] {
  const out: NextRedirect[] = [];
  for (const { from, to } of CASINO_SLUG_RENAMES) {
    out.push({ source: `${BASE}/${from}`, destination: `${BASE}/${to}`, permanent: true });
    out.push({ source: `${BASE}/${from}/:path+`, destination: `${BASE}/${to}/:path+`, permanent: true });
  }
  return out;
}
