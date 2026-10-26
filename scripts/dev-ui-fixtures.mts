#!/usr/bin/env -S npx tsx
/**
 * Seed clearly-marked TEST data (zz-ui-*) in Supabase DEV + generate the UI test CSV,
 * so ImportWizard can be exercised manually without touching real rows. DEV ONLY.
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   npx tsx scripts/dev-ui-fixtures.mts         # seed + write CSV
 *   npx tsx scripts/dev-ui-fixtures.mts clean   # remove all test data + CSV
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { csvColumns, ENTITY_DESCRIPTORS } from "@/lib/io/entities";
import { toCsv } from "@/lib/bulk";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SVC) { console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)."); process.exit(2); }
if (URL.includes("rmnltqmmemqfgvjglzqa")) { console.error("REFUZ: URL de PRODUCȚIE. Rulează doar pe DEV."); process.exit(2); }

const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
const PFX = "zz-ui-";
const CSV_PATH = resolve(process.cwd(), "test-import-upsert.csv");
const clean = process.argv[2] === "clean";

async function removeData() {
  const { data } = await db.from("casinos").select("id").like("slug", `${PFX}%`);
  const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
  if (ids.length) {
    await db.from("casino_tags").delete().in("casino_id", ids);
    await db.from("casinos").delete().in("id", ids);
  }
  return ids.length;
}

async function main() {
  if (clean) {
    const n = await removeData();
    try { rmSync(CSV_PATH); } catch { /* ignore */ }
    const { data: left } = await db.from("casinos").select("slug").like("slug", `${PFX}%`);
    console.log(`Cleanup: ${n} rânduri șterse · CSV șters · reziduale: ${((left as unknown[]) ?? []).length}`);
    process.exit(((left as unknown[]) ?? []).length ? 1 : 0);
  }

  await removeData(); // idempotent re-seed

  const { data: tagsData } = await db.from("tags").select("id, slug").in("slug", ["nou", "recomandat", "retrageri-rapide"]);
  const tagId = new Map(((tagsData as { id: string; slug: string }[]) ?? []).map((t) => [t.slug, t.id]));
  if (!tagId.has("nou")) { console.error("Tag-ul 'nou' lipsește în DEV."); process.exit(3); }

  const { data: seeded, error } = await db.from("casinos").insert([
    { slug: `${PFX}alpha`, name: "TEST UI Alpha", status: "published", min_deposit: "10 RON", payout_speed: "24h", offer_url: `/go/${PFX}alpha` },
    { slug: `${PFX}beta`, name: "TEST UI Beta", status: "draft", min_deposit: "20 RON", offer_url: `/go/${PFX}beta` },
  ]).select("id, slug");
  if (error || !seeded) { console.error("Seed eșuat:", error?.message); process.exit(3); }
  const alphaId = (seeded as { id: string; slug: string }[]).find((r) => r.slug === `${PFX}alpha`)!.id;
  await db.from("casino_tags").insert({ casino_id: alphaId, tag_id: tagId.get("nou") });

  // Generate the UI test CSV (match by slug; id blank). Exercises every ImportWizard path.
  const H = csvColumns(ENTITY_DESCRIPTORS.casinos);
  const blank = () => Object.fromEntries(H.map((c) => [c, ""])) as Record<string, string>;
  const rows: Record<string, string>[] = [
    { ...blank(), slug: `${PFX}alpha`, min_deposit: "15 RON", payout_speed: "__CLEAR__", tag_slugs: "recomandat|retrageri-rapide" },
    { ...blank(), slug: `${PFX}beta` }, // toate goale → UNCHANGED
    { ...blank(), slug: `${PFX}gamma`, name: "TEST UI Gamma" }, // CREATE (draft)
    { ...blank(), slug: `${PFX}bad`, name: "" }, // EROARE: name obligatoriu
  ];
  writeFileSync(CSV_PATH, toCsv(H, rows.map((o) => H.map((c) => o[c] ?? ""))));

  console.log("== Date de test DEV pregătite ==");
  console.log(`  seeded: ${PFX}alpha [published, tag=nou], ${PFX}beta [draft]`);
  console.log(`  CSV UI: ${CSV_PATH}`);
  console.log("  Rânduri în CSV: alpha(UPDATE+CLEAR+relații+published-confirm), beta(UNCHANGED), gamma(CREATE), bad(EROARE)");
}
main().catch((e) => { console.error(e); process.exit(1); });
