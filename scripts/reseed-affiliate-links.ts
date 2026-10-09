/**
 * Maintenance script: refresh ONLY the affiliate_links table so /go/<slug>
 * resolves to the operator's real URL. Replaces the previous placeholder values
 * (which were internal /go/ paths) without touching any other table/timestamps.
 *
 * Run: node --env-file=.env.local --import tsx scripts/reseed-affiliate-links.ts
 */
import { createClient } from "@supabase/supabase-js";
import { allCasinos } from "../src/data/casinos";
import { allBonuses } from "../src/data/bonuses";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// PLACEHOLDER operator homepages — replace with real tracking URLs before launch.
const AFFILIATE_URLS: Record<string, string> = {
  "superbet-casino": "https://www.superbet.ro",
  "betano-casino": "https://www.betano.ro",
  "unibet-casino": "https://www.unibet.ro",
  "winbet-casino": "https://www.winbet.ro",
  "netbet-casino": "https://www.netbet.ro",
  "vlad-casino": "https://www.vladcazino.ro",
  "las-vegas-casino": "https://www.lasvegas.ro",
  "maxbet-casino": "https://www.maxbet.ro",
};

async function main() {
  const { data, error } = await db.from("casinos").select("id, slug");
  if (error) throw new Error(`casinos: ${error.message}`);
  const map = new Map<string, string>();
  for (const c of (data ?? []) as Array<{ id: string; slug: string }>) map.set(c.slug, c.id);

  const rows: Array<Record<string, unknown>> = [];
  for (const c of allCasinos) {
    const casino_id = map.get(c.slug);
    const u = AFFILIATE_URLS[c.slug];
    if (casino_id && u)
      rows.push({ casino_id, placement: "review_cta", url: u, campaign: null, is_active: true });
  }
  for (const b of allBonuses) {
    const casino_id = map.get(b.casinoSlug);
    const u = AFFILIATE_URLS[b.casinoSlug];
    if (casino_id && u)
      rows.push({ casino_id, placement: "bonus_claim", url: u, campaign: b.slug, is_active: true });
  }

  const del = await db.from("affiliate_links").delete().not("id", "is", null);
  if (del.error) throw new Error(`delete: ${del.error.message}`);
  const ins = await db.from("affiliate_links").insert(rows);
  if (ins.error) throw new Error(`insert: ${ins.error.message}`);
  console.log(`affiliate_links refreshed: ${rows.length} rows (external URLs).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
