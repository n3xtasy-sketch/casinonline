#!/usr/bin/env node
/**
 * Pre-publish go-live gate (read-only). Reports CRITICAL (🔴) blockers on PUBLISHED
 * content only, per the Dashboard Health rules. Local/admin tooling — uses the
 * service_role key from the environment; NEVER imported into app runtime.
 *
 * Run:  set -a; . ./.env.local; set +a; node scripts/pre-publish-health.mjs
 * (point the env at Production to gate the prod go-live)
 *
 * Exit 0 = GO-LIVE READY (0 critical); exit 1 = blockers present.
 */
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY în environment.");
  process.exit(2);
}

async function q(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}
const blank = (v) => v == null || String(v).trim() === "";

const critical = []; // { label }
let warnings = 0;

function block(label) {
  critical.push(label);
}

const run = async () => {
  // casinos (published): intro + active review_cta
  const casinos = await q("casinos?status=eq.published&select=id,slug,name,intro,logo_url");
  const rc = await q("affiliate_links?placement=eq.review_cta&is_active=eq.true&select=casino_id");
  const rcSet = new Set(rc.map((r) => r.casino_id));
  for (const c of casinos) {
    if (blank(c.intro)) block(`Cazino „${c.name}" (${c.slug}): fără intro`);
    if (!rcSet.has(c.id)) block(`Cazino „${c.name}" (${c.slug}): fără link review_cta activ`);
    if (blank(c.logo_url)) warnings++;
  }

  // games (published): provider + category + intro
  const games = await q("games?status=eq.published&select=slug,name,provider_id,category_id,intro,thumbnail_url");
  for (const g of games) {
    if (!g.provider_id) block(`Joc „${g.name}" (${g.slug}): fără furnizor`);
    if (!g.category_id) block(`Joc „${g.name}" (${g.slug}): fără categorie`);
    if (blank(g.intro)) block(`Joc „${g.name}" (${g.slug}): fără intro`);
    if (blank(g.thumbnail_url)) warnings++;
  }

  // providers (published): intro
  const providers = await q("providers?status=eq.published&select=slug,name,intro,logo_url");
  for (const p of providers) {
    if (blank(p.intro)) block(`Furnizor „${p.name}" (${p.slug}): fără intro`);
    if (blank(p.logo_url)) warnings++;
  }

  // payment_methods (published): intro
  const payments = await q("payment_methods?status=eq.published&select=slug,name,intro,logo_url");
  for (const p of payments) {
    if (blank(p.intro)) block(`Metodă „${p.name}" (${p.slug}): fără intro`);
    if (blank(p.logo_url)) warnings++;
  }

  // guides (published): intro
  const guides = await q("guides?status=eq.published&select=slug,title,intro,image_url");
  for (const g of guides) {
    if (blank(g.intro)) block(`Ghid „${g.title}" (${g.slug}): fără intro`);
    if (blank(g.image_url)) warnings++;
  }

  // bonuses (published): intro + casino published (broken relationship)
  const bonuses = await q("bonuses?status=eq.published&select=slug,offer,intro,casino:casinos(status,slug)");
  for (const b of bonuses) {
    if (blank(b.intro)) block(`Bonus „${b.offer}" (${b.slug}): fără intro`);
    const cs = b.casino?.status;
    if (cs !== "published") block(`Bonus „${b.offer}" (${b.slug}): cazino non-published (${cs ?? "lipsă"}) — relație stricată`);
  }

  console.log("====================================");
  console.log(`GO-LIVE READY: ${critical.length === 0 ? "YES" : "NO"}`);
  console.log(`Critical issues: ${critical.length}`);
  console.log(`Warnings (non-blocking, logo/thumbnail): ${warnings}`);
  console.log("====================================");
  if (critical.length) {
    console.log("\nBlochează go-live:");
    for (const c of critical) console.log(`  🔴 ${c}`);
  }
  process.exit(critical.length === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error("Eroare:", e.message);
  process.exit(2);
});
