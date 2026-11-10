/**
 * AI-2.9D.2E — best-effort in-flight guard against accidental DOUBLE triggers of the LIVE A/B run.
 *
 * LIMITATION (documented, not papered over): this is an in-memory, PER-INSTANCE guard. On a serverless
 * runtime (Vercel) different invocations may land on different instances, so it does NOT provide a
 * cross-instance exactly-once guarantee. It reliably stops the common case — a double-click / concurrent
 * submit hitting the same warm instance — without new infrastructure. A true exactly-once guard would need
 * a shared lock / idempotency row (a DB write), which is out of scope here.
 */

const inFlight = new Set<string>();

/** Try to start a run for `key`. Returns false if one is already in flight (reject the duplicate). */
export function acquireABRun(key: string): boolean {
  if (inFlight.has(key)) return false;
  inFlight.add(key);
  return true;
}

/** Release the in-flight slot for `key` (always call in a finally). */
export function releaseABRun(key: string): void {
  inFlight.delete(key);
}

export function isABRunInFlight(key: string): boolean {
  return inFlight.has(key);
}
