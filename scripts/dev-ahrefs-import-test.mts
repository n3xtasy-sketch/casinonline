#!/usr/bin/env -S npx tsx
/**
 * FAZA 5.1C DEV E2E — Ahrefs import apply + reimport preserve + in-file dedup.
 * Runs the REAL module (dryRunAhrefs/applyAhrefs) under an authenticated ADMIN session
 * (RLS-gated). Fixtures + cleanup via service_role. Refuses non-DEV.
 *
 * Usage: set -a; . ./.env.local; set +a; npx tsx scripts/dev-ahrefs-import-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dryRunAhrefs, applyAhrefs, detectMapping, type BuildOpts } from "@/lib/io/ahrefs-import";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_ANON_KEY!;
if (!URL || !SVC || !ANON || !URL.includes("radhontyxrzjeatsaccg")) { console.error("⛔ necesită DEV + chei."); process.exit(2); }

const svc = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
let pass = 0, fail = 0;
const ok = (c: boolean, l: string, e = "") => { if (c) { pass++; console.log(`  ✅ ${l}`); } else { fail++; console.log(`  ❌ ${l}${e ? ` · ${e}` : ""}`); } };
const users: string[] = [];

function opts(headers: string[]): BuildOpts {
  return { mapping: detectMapping(headers).mapping, wizardCountry: "ro", countryMode: "wizard" };
}

async function main() {
  console.log("== 5.1C Ahrefs import DEV E2E ==");
  const c = await svc.auth.admin.createUser({ email: "zzahrefs-admin@example.com", password: "zz-Test-Pass-123456", email_confirm: true });
  if (c.error) throw new Error(c.error.message);
  users.push(c.data.user!.id);
  await svc.from("profiles").update({ is_admin: true }).eq("id", c.data.user!.id);
  const admin = createClient(URL, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  await admin.auth.signInWithPassword({ email: "zzahrefs-admin@example.com", password: "zz-Test-Pass-123456" });

  const proj = await admin.from("seo_projects").insert({ name: "zz ahrefs proj" }).select("id").single();
  const projId = (proj.data as { id: string }).id;

  // ── import #1 ──
  const csv1 = "Keyword,Volume,KD,Intent\nBonus Fără Depunere,1000,5,informational\nRotiri Gratuite,800,12,commercial\npacanele,500,20,";
  const d1 = await dryRunAhrefs(admin, projId, csv1, opts(["Keyword", "Volume", "KD", "Intent"]));
  ok(!("error" in d1) && d1.toCreate === 3 && d1.toUpdate === 0, "dry-run #1: 3 noi", JSON.stringify("error" in d1 ? d1 : { c: d1.toCreate }));
  const a1 = await applyAhrefs(admin, projId, "a.csv", csv1, opts(["Keyword", "Volume", "KD", "Intent"]), (d1 as { hash: string }).hash);
  ok(!("error" in a1) && a1.created === 3, "apply #1: created=3", JSON.stringify(a1));

  // set manual decisions on one keyword
  const cl = await admin.from("seo_clusters").insert({ project_id: projId, name: "zz cluster" }).select("id").single();
  const clId = (cl.data as { id: string }).id;
  await admin.from("seo_keywords").update({ cluster_id: clId, mapped_url: "/cazinouri-online/x", mapping_status: "confirmed", status: "targeted" })
    .eq("project_id", projId).eq("keyword_normalized", "bonus fara depunere");

  // ── reimport #2: changed Volume, KD column REMOVED (must preserve KD + manual fields) ──
  const csv2 = "Keyword,Volume\nBonus Fără Depunere,1500\nRotiri Gratuite,850";
  const h2 = opts(["Keyword", "Volume"]);
  const d2 = await dryRunAhrefs(admin, projId, csv2, h2);
  ok(!("error" in d2) && d2.toUpdate === 2 && d2.toCreate === 0, "dry-run #2: 2 actualizate", JSON.stringify("error" in d2 ? d2 : { u: d2.toUpdate }));
  const a2 = await applyAhrefs(admin, projId, "b.csv", csv2, h2, (d2 as { hash: string }).hash);
  ok(!("error" in a2) && a2.updated === 2, "apply #2: updated=2", JSON.stringify(a2));

  const kw = (await svc.from("seo_keywords").select("volume, difficulty, cluster_id, mapped_url, mapping_status, status").eq("project_id", projId).eq("keyword_normalized", "bonus fara depunere").single()).data as Record<string, unknown>;
  ok(kw.volume === 1500, "reimport: volume actualizat (1000→1500)");
  ok(kw.difficulty === 5, "reimport: KD PĂSTRAT (coloană lipsă → nu se șterge)", String(kw.difficulty));
  ok(kw.cluster_id === clId, "reimport: cluster_id PĂSTRAT");
  ok(kw.mapped_url === "/cazinouri-online/x" && kw.mapping_status === "confirmed", "reimport: mapped_url + mapping_status PĂSTRATE");
  ok(kw.status === "targeted", "reimport: status editorial PĂSTRAT");

  // ── in-file dedup ──
  const csv3 = "Keyword,Volume\nSuper Bonus,10\nsuper bonus,20";
  const d3 = await dryRunAhrefs(admin, projId, csv3, opts(["Keyword", "Volume"]));
  ok(!("error" in d3) && d3.dupInFile === 1 && d3.toCreate === 1, "dedup în fișier: 1 dup, 1 creat", JSON.stringify("error" in d3 ? d3 : { d: d3.dupInFile, c: d3.toCreate }));

  // cleanup
  await svc.from("seo_projects").delete().eq("id", projId);
  for (const u of users) await svc.auth.admin.deleteUser(u);
  const resid = (await svc.from("seo_projects").select("id", { count: "exact", head: true }).like("name", "zz %")).count ?? 0;
  ok(resid === 0, "cleanup complet");

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { for (const u of users) await svc.auth.admin.deleteUser(u).catch(() => {}); console.error("EROARE:", e.message); process.exit(1); });
