import { normalizePath } from "@/lib/redirects";

/**
 * Module-scope TTL cache of active redirects for the proxy (middleware can't use
 * React `use cache`). BEST-EFFORT per runtime instance / isolate — NOT a guaranteed
 * global cache; a cold isolate re-fetches. At most ~1 Supabase read per TTL per
 * instance (anon key, active rows only — no service_role). Admin changes propagate
 * within ≤ TTL.
 */
interface RedirectHit {
  to: string;
  code: number;
}

const TTL_MS = 60_000;

let cache: { map: Map<string, RedirectHit>; at: number } | null = null;
let inflight: Promise<Map<string, RedirectHit>> | null = null;

async function fetchMap(): Promise<Map<string, RedirectHit>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const map = new Map<string, RedirectHit>();
  if (!url || !key) return map;
  const res = await fetch(
    `${url}/rest/v1/redirects?select=from_path,to_path,status_code&is_active=eq.true`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`redirects fetch ${res.status}`);
  const rows = (await res.json()) as { from_path: string; to_path: string; status_code: number }[];
  for (const r of rows) {
    map.set(normalizePath(r.from_path), { to: r.to_path, code: r.status_code });
  }
  return map;
}

/** Look up an active redirect for a normalized path. null when none / on fetch error. */
export async function getRedirect(path: string): Promise<RedirectHit | null> {
  const now = Date.now();
  if (!cache || now - cache.at > TTL_MS) {
    if (!inflight) {
      inflight = fetchMap()
        .then((map) => {
          cache = { map, at: Date.now() };
          inflight = null;
          return map;
        })
        .catch((e) => {
          inflight = null;
          throw e;
        });
    }
    try {
      await inflight;
    } catch {
      // On fetch failure, serve stale cache if present; otherwise no redirect.
      return cache?.map.get(path) ?? null;
    }
  }
  return cache?.map.get(path) ?? null;
}
