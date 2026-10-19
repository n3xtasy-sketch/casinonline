#!/usr/bin/env node
/**
 * Seed ONLY the approved taxonomies (lookup tables) — no demo content.
 * Idempotent (check-then-insert: inserts only missing slugs; never updates/deletes).
 * Does NOT touch scripts/seed.ts and does NOT write content (casinos/games/bonuses/...).
 *
 * DRY RUN by default (no writes — previews what would be inserted).
 * Apply:  set -a; . ./.env.local; set +a; node scripts/seed-taxonomies.mjs --apply
 * (point the env at Production to seed prod)
 */
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");
if (!URL || !KEY) {
  console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY în environment.");
  process.exit(2);
}

// 24 approved taxonomies. sort_order = index in each list.
const TAXONOMIES = {
  game_categories: [
    ["sloturi", "Sloturi"],
    ["megaways", "Megaways"],
    ["jackpot", "Jackpot"],
    ["live-casino", "Live Casino"],
    ["jocuri-de-masa", "Jocuri de masă"],
  ],
  guide_categories: [
    ["bonusuri", "Bonusuri"],
    ["jocuri", "Jocuri"],
    ["ghiduri", "Ghiduri"],
    ["metode-de-plata", "Metode de plată"],
  ],
  bonus_types: [
    ["bonus-de-bun-venit", "Bonus de bun venit"],
    ["fara-depunere", "Fără depunere"],
    ["rotiri-gratuite", "Rotiri gratuite"],
    ["cashback", "Cashback"],
    ["fara-rulaj", "Fără rulaj"],
  ],
  payment_types: [
    ["card", "Card"],
    ["ewallet", "Portofel electronic"],
    ["prepaid", "Preplătit"],
    ["mobile", "Plăți mobile"],
    ["transfer-bancar", "Transfer bancar"],
  ],
  tags: [
    ["recomandat", "Recomandat"],
    ["retrageri-rapide", "Retrageri rapide"],
    ["nou", "Nou"],
    ["fara-depunere", "Fără depunere"],
    ["popular", "Popular"],
  ],
};

async function getExisting(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=slug`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table} read -> ${res.status} ${await res.text()}`);
  return new Set((await res.json()).map((r) => r.slug));
}

async function insertRows(table, rows) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table} insert -> ${res.status} ${await res.text()}`);
}

const run = async () => {
  console.log(`== seed-taxonomies ${APPLY ? "(APPLY)" : "(DRY RUN — fără scrieri)"} ==`);
  let totalMissing = 0;
  for (const [table, items] of Object.entries(TAXONOMIES)) {
    const existing = await getExisting(table);
    const missing = items
      .map(([slug, label], i) => ({ slug, label, sort_order: i }))
      .filter((r) => !existing.has(r.slug));
    console.log(`\n${table}: ${existing.size} existente | ${missing.length} de inserat`);
    for (const r of missing) console.log(`  + ${r.slug} → ${r.label} (sort ${r.sort_order})`);
    totalMissing += missing.length;
    if (APPLY && missing.length) {
      await insertRows(table, missing);
      console.log(`  ✓ inserate ${missing.length}`);
    }
  }
  console.log(`\nTotal de inserat: ${totalMissing}`);
  if (!APPLY) console.log("DRY RUN — nimic scris. Rulează cu --apply pentru a insera.");
  else console.log("APPLY terminat.");
};

run().catch((e) => {
  console.error("Eroare:", e.message);
  process.exit(1);
});
