/**
 * Demo (free-play) iframe validation + host allowlist — pure, client+server safe.
 *
 * DEFAULT-DENY. A demo URL is accepted (saved in Admin, rendered on the page)
 * ONLY when it is https AND its host is on DEMO_ALLOWED_HOSTS. We never allow an
 * arbitrary https URL: a demo embed is third-party active content, so the host
 * must be explicitly vetted first.
 *
 * The active allowlist starts EMPTY on purpose. Add a host here ONLY after you
 * have verified that it actually permits third-party framing (i.e. it does NOT
 * send X-Frame-Options: DENY/SAMEORIGIN and its CSP frame-ancestors allows our
 * origin). A reachable URL is NOT proof it can be framed — confirm framing from
 * our domain explicitly before enabling. Add the host in the SAME change in
 * which you save a demo_url that uses it.
 */

export const DEMO_ALLOWED_HOSTS: readonly string[] = [
  // Add vetted provider demo hosts here, e.g.:
  //   "demogamesfree.pragmaticplay.net",  // VERIFY framing permission before enabling
  // Each entry matches that exact host and any subdomain of it.
];

/** True when `host` equals an allowlist entry or is a subdomain of one. */
function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  return DEMO_ALLOWED_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

/**
 * Validate a candidate demo URL: must parse, be https, and have an allowlisted
 * host. Returns false for empty/invalid input, non-https schemes (javascript:,
 * data:, http:, etc.), and any host not explicitly vetted.
 */
export function isAllowedDemoUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  return hostAllowed(u.hostname);
}
