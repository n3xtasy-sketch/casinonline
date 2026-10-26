#!/usr/bin/env -S npx tsx
/**
 * Faza 2 / Etapa Bonusuri — E2E for the 11 new fields via the REAL pipeline. DEV ONLY.
 * Needs migrations 0026 + 0027 applied in DEV first (self-checks and exits if not).
 * Throwaway rows only (slug zz-bf2-*), cleanup in finally + post-check.
 * Usage: set -a; . ./.env.local; set +a; npx tsx scripts/dev-bonuses-faza2-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dryRunImport, applyImport } from "@/lib/io/pipeline";
import { csvColumns, ENTITY_DESCRIPTORS } from "@/lib/io/entities";
import { toCsv } from "@/lib/bulk";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SVC) { console.error("Lipsește SUPABASE_URL / SERVICE_ROLE_KEY (.env.local)."); process.exit(2); }
if (URL.includes("rmnltqmmemqfgvjglzqa")) { console.error("REFUZ: PRODUCȚIE. Doar DEV."); process.exit(2); }

const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
const H = csvColumns(ENTITY_DESCRIPTORS.bonuses);
const blank = () => Object.fromEntries(H.map((c) => [c, ""])) as Record<string, string>;
const csv = (rows: Record<string, string>[]) => toCsv(H, rows.map((o) => H.map((c) => o[c] ?? "")));
const PFX = "zz-bf2-";
const err = (r: unknown): r is { error: string } => typeof r === "object" && r !== null && "error" in r;

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => { console.log(`  ${ok ? "✅" : "❌"} ${n}${d ? " · " + d : ""}`); if (ok) pass++; else fail++; };
const row = async (slug: string) =>
  (await db.from("bonuses").select("spin_value,max_win,wagering_multiplier,kyc_required,eligible_slots,reward_stages,verified_at,terms_url,status").eq("slug", slug).maybeSingle()).data as Record<string, unknown> | null;
async function cleanup() {
  const { data } = await db.from("bonuses").select("id").like("slug", `${PFX}%`);
  const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
  if (ids.length) await db.from("bonuses").delete().in("id", ids);
  return ids.length;
}
const apply = async (text: string) => {
  const d = await dryRunImport(db, "bonuses", text, "upsert");
  if (err(d)) throw new Error("dryRun: " + d.error);
  return applyImport(db, "bonuses", text, d.hash, "upsert", true);
};

async function main() {
  console.log(`== Faza2 bonuses E2E · ${URL.replace(/https:\/\/([a-z0-9]+).*/, "$1")} ==`);
  const col = await db.from("bonuses").select("spin_value").limit(1);
  if (col.error) { console.error("Coloana spin_value lipsește → aplică 0026 în DEV mai întâi:", col.error.message); process.exit(3); }
  const wl = await db.rpc("import_apply_row", { p_table: "bonuses", p_id: "00000000-0000-0000-0000-0000000000ff", p_patch: { spin_value: 1 }, p_junctions: [] });
  if (wl.error && /not allowed/i.test(wl.error.message)) { console.error("Whitelist RPC fără spin_value → aplică 0027 în DEV mai întâi."); process.exit(3); }

  const casino = (await db.from("casinos").select("slug").eq("status", "published").limit(1).maybeSingle()).data as { slug: string } | null;
  if (!casino) { console.error("Niciun cazino published în DEV."); process.exit(3); }
  const baseline = ((await db.from("bonuses").select("id").not("slug", "like", `${PFX}%`)).data as unknown[] ?? []).length;

  await cleanup();
  try {
    const stages = JSON.stringify([{ label: "Tranșa 1", free_spins: 50, trigger: "deposit" }, { label: "Tranșa 2", free_spins: 50, within: "7 zile" }]);
    // CREATE cu câmpuri noi: wagering_multiplier=0 (fără rulaj), kyc_required=false, eligible_slots listă, reward_stages 2 tranșe
    const c = await apply(csv([{ ...blank(), slug: `${PFX}a`, casino_slug: casino.slug, offer: "TEST BONUS", spin_value: "0.10", max_win: "10000", wagering_multiplier: "0", kyc_required: "false", eligible_slots: "book|starburst", reward_stages: stages, verified_at: "2026-02-01" }]));
    check("CREATE: 1 creat", !err(c) && c.created === 1);
    const a1 = await row(`${PFX}a`);
    check("CREATE: spin_value=0.10, max_win=10000", Number(a1?.spin_value) === 0.10 && Number(a1?.max_win) === 10000);
    check("CREATE: wagering_multiplier=0 (NU null)", a1?.wagering_multiplier === 0);
    check("CREATE: kyc_required=false (NU null)", a1?.kyc_required === false);
    check("CREATE: eligible_slots = [book,starburst]", Array.isArray(a1?.eligible_slots) && (a1!.eligible_slots as string[]).length === 2);
    check("CREATE: reward_stages = 2 tranșe", Array.isArray(a1?.reward_stages) && (a1!.reward_stages as unknown[]).length === 2);
    check("CREATE: status draft", a1?.status === "draft");

    // UPSERT: wagering_multiplier→35, kyc_required→true, reward_stages __CLEAR__ (→null); spin_value gol = păstrează
    const u = await apply(csv([{ ...blank(), slug: `${PFX}a`, casino_slug: casino.slug, offer: "TEST BONUS", wagering_multiplier: "35", kyc_required: "true", reward_stages: "__CLEAR__" }]));
    check("UPSERT: 1 actualizat", !err(u) && u.updated === 1);
    const a2 = await row(`${PFX}a`);
    check("UPSERT: wagering_multiplier 0→35", a2?.wagering_multiplier === 35);
    check("UPSERT: kyc_required false→true", a2?.kyc_required === true);
    check("UPSERT: reward_stages CLEAR→null (≠[])", a2?.reward_stages === null);
    check("UPSERT: spin_value gol a păstrat 0.10", Number(a2?.spin_value) === 0.10);

    // CLEAR numeric + listă
    const u2 = await apply(csv([{ ...blank(), slug: `${PFX}a`, casino_slug: casino.slug, offer: "TEST BONUS", spin_value: "__CLEAR__", eligible_slots: "__CLEAR__" }]));
    check("CLEAR: apply ok", !err(u2));
    const a3 = await row(`${PFX}a`);
    check("CLEAR: spin_value→null, eligible_slots→null", a3?.spin_value === null && a3?.eligible_slots === null);

    // Reimport identic → unchanged
    const same = csv([{ ...blank(), slug: `${PFX}a`, casino_slug: casino.slug, offer: "TEST BONUS", wagering_multiplier: "35", kyc_required: "true" }]);
    await apply(same);
    const d2 = await dryRunImport(db, "bonuses", same, "upsert");
    check("REIMPORT: 0 de actualizat (unchanged)", !err(d2) && d2.toUpdate === 0 && d2.toUnchanged === 1);

    // Validare numerică negativă respinsă în dry-run
    const bad = await dryRunImport(db, "bonuses", csv([{ ...blank(), slug: `${PFX}bad`, casino_slug: casino.slug, offer: "X", spin_value: "-5" }]), "upsert");
    check("VALIDARE: spin_value negativ → rând eroare", !err(bad) && bad.errors === 1);
  } finally {
    const n = await cleanup();
    const left = ((await db.from("bonuses").select("slug").like("slug", `${PFX}%`)).data as unknown[] ?? []).length;
    const after = ((await db.from("bonuses").select("id").not("slug", "like", `${PFX}%`)).data as unknown[] ?? []).length;
    console.log(`  (cleanup: ${n} șterse · reziduale: ${left} · bonusuri reale: ${baseline}→${after})`);
    if (left > 0) { console.error("❌ REZIDUALE!"); fail++; }
    if (after !== baseline) { console.error("❌ nr. bonusuri reale s-a schimbat!"); fail++; }
  }
  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
