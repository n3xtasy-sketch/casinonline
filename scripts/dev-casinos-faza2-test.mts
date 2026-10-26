#!/usr/bin/env -S npx tsx
/**
 * Faza 2 / Etapa Casinos — E2E for the 4 new fields, via the REAL pipeline. DEV ONLY.
 * Needs migrations 0024 + 0025 applied in DEV first (script self-checks and exits if not).
 * Throwaway rows only (slug zz-f2-*), cleanup in finally + post-check.
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   npx tsx scripts/dev-casinos-faza2-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dryRunImport, applyImport } from "@/lib/io/pipeline";
import { csvColumns, ENTITY_DESCRIPTORS } from "@/lib/io/entities";
import { toCsv } from "@/lib/bulk";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SVC) { console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)."); process.exit(2); }
if (URL.includes("rmnltqmmemqfgvjglzqa")) { console.error("REFUZ: URL de PRODUCȚIE. Rulează doar pe DEV."); process.exit(2); }

const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
const H = csvColumns(ENTITY_DESCRIPTORS.casinos);
const blank = () => Object.fromEntries(H.map((c) => [c, ""])) as Record<string, string>;
const csv = (rows: Record<string, string>[]) => toCsv(H, rows.map((o) => H.map((c) => o[c] ?? "")));
const PFX = "zz-f2-";
const err = (r: unknown): r is { error: string } => typeof r === "object" && r !== null && "error" in r;

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => { console.log(`  ${ok ? "✅" : "❌"} ${n}${d ? " · " + d : ""}`); if (ok) pass++; else fail++; };
const row = async (slug: string) =>
  (await db.from("casinos").select("year_launched,license_verified_at,license_source,verification_source,status").eq("slug", slug).maybeSingle()).data as
    { year_launched: number | null; license_verified_at: string | null; license_source: string | null; verification_source: string | null; status: string } | null;
async function cleanup() {
  const { data } = await db.from("casinos").select("id").like("slug", `${PFX}%`);
  const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
  if (ids.length) { await db.from("casino_tags").delete().in("casino_id", ids); await db.from("casinos").delete().in("id", ids); }
  return ids.length;
}
const apply = async (text: string, mode: "create" | "upsert") => {
  const d = await dryRunImport(db, "casinos", text, mode);
  if (err(d)) throw new Error("dryRun: " + d.error);
  return { report: d, outcome: await applyImport(db, "casinos", text, d.hash, mode, true) };
};

async function main() {
  console.log(`== Faza2 casinos E2E · ${URL.replace(/https:\/\/([a-z0-9]+).*/, "$1")} ==`);

  // Preflight: 0024 (column) + 0025 (RPC whitelist) present?
  const colCheck = await db.from("casinos").select("year_launched").limit(1);
  if (colCheck.error) { console.error("Coloana year_launched lipsește → aplică 0024 în DEV mai întâi:", colCheck.error.message); process.exit(3); }
  const wl = await db.rpc("import_apply_row", { p_table: "casinos", p_id: "00000000-0000-0000-0000-0000000000ff", p_patch: { year_launched: 1 }, p_junctions: [] });
  if (wl.error && /not allowed/i.test(wl.error.message)) { console.error("Whitelist RPC nu include year_launched → aplică 0025 în DEV mai întâi."); process.exit(3); }

  await cleanup();
  try {
    // CREATE
    const createCsv = csv([{ ...blank(), slug: `${PFX}a`, name: "TEST F2 A", year_launched: "2019", license_verified_at: "2026-02-01", license_source: "https://onjn.gov.ro/a", verification_source: "https://ex.com/a" }]);
    const c = await apply(createCsv, "upsert");
    check("CREATE: 1 creat", !err(c.outcome) && c.outcome.created === 1);
    const a1 = await row(`${PFX}a`);
    check("CREATE: câmpuri salvate + draft", a1?.year_launched === 2019 && a1?.license_verified_at === "2026-02-01" && a1?.license_source === "https://onjn.gov.ro/a" && a1?.verification_source === "https://ex.com/a" && a1?.status === "draft");

    // UPSERT: schimbă year, CLEAR license_source, restul gol = păstrează
    const upCsv = csv([{ ...blank(), slug: `${PFX}a`, year_launched: "2020", license_source: "__CLEAR__" }]);
    const u = await apply(upCsv, "upsert");
    check("UPSERT: 1 actualizat", !err(u.outcome) && u.outcome.updated === 1);
    const a2 = await row(`${PFX}a`);
    check("UPSERT: year 2019→2020", a2?.year_launched === 2020);
    check("UPSERT: license_source CLEAR→null", a2?.license_source === null);
    check("UPSERT: celule goale au păstrat (license_verified_at, verification_source)", a2?.license_verified_at === "2026-02-01" && a2?.verification_source === "https://ex.com/a");

    // REIMPORT același upsert → unchanged
    const re = await dryRunImport(db, "casinos", upCsv, "upsert");
    check("REIMPORT: 0 de actualizat (unchanged)", !err(re) && re.toUpdate === 0 && re.toUnchanged === 1);

    // VALIDARE: year_launched non-numeric respins în dry-run
    const badCsv = csv([{ ...blank(), slug: `${PFX}bad`, name: "Bad", year_launched: "abc" }]);
    const bad = await dryRunImport(db, "casinos", badCsv, "upsert");
    check("VALIDARE: year_launched='abc' → rând eroare", !err(bad) && bad.errors === 1);
  } finally {
    const n = await cleanup();
    const left = ((await db.from("casinos").select("slug").like("slug", `${PFX}%`)).data as unknown[] ?? []).length;
    console.log(`  (cleanup: ${n} șterse · reziduale: ${left})`);
    if (left > 0) { console.error("❌ DATE REZIDUALE!"); fail++; }
  }
  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
