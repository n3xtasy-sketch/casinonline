#!/usr/bin/env -S npx tsx
/**
 * FAZA 5.1B DEV verification — migration 0033 + SEO Research RLS/constraints/dedup.
 * Refuses non-DEV. Creates throwaway ADMIN + NON-ADMIN users to test RLS behaviorally
 * (service_role bypasses RLS, so it cannot prove the admin policy). Cleans up in finally.
 *
 * Usage: set -a; . ./.env.local; set +a; npx tsx scripts/dev-seo-research-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeKeyword } from "@/lib/seo-research";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_ANON_KEY!;
if (!URL || !SVC || !ANON) { console.error("Lipsește SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY."); process.exit(2); }
if (!URL.includes("radhontyxrzjeatsaccg")) { console.error(`⛔ Nu e DEV (${URL}). Refuz.`); process.exit(2); }

const svc = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
let pass = 0, fail = 0;
function ok(c: boolean, label: string, extra = "") { if (c) { pass++; console.log(`  ✅ ${label}`); } else { fail++; console.log(`  ❌ ${label}${extra ? ` · ${extra}` : ""}`); } }

const TAG = "zzseo";
const password = "zz-Test-Pass-123456";
const createdUsers: string[] = [];

async function mkUser(email: string, isAdmin: boolean): Promise<SupabaseClient> {
  const c = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (c.error) throw new Error(`createUser ${email}: ${c.error.message}`);
  const uid = c.data.user!.id;
  createdUsers.push(uid);
  if (isAdmin) await svc.from("profiles").update({ is_admin: true }).eq("id", uid);
  const cli = createClient(URL, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  const si = await cli.auth.signInWithPassword({ email, password });
  if (si.error) throw new Error(`signIn ${email}: ${si.error.message}`);
  return cli;
}
const NORM = "bonus fara depunere";

async function main() {
  console.log("== 5.1B SEO Research DEV verification ==");

  console.log("#1 Tabele existente:");
  for (const t of ["seo_projects", "seo_imports", "seo_keywords", "seo_clusters", "seo_briefs"]) {
    const { error } = await svc.from(t).select("id").limit(0);
    ok(!error, `  ${t}`, error?.message);
  }

  const admin = await mkUser(`${TAG}-admin@example.com`, true);
  const anon = createClient(URL, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  const user = await mkUser(`${TAG}-user@example.com`, false);

  // ── #2 RLS behavioral ──
  console.log("#2 RLS:");
  const ap = await admin.from("seo_projects").insert({ name: "zz p1" }).select("id, default_country, created_at").single();
  ok(!ap.error && !!ap.data, "admin: insert proiect reușit", ap.error?.message);
  const p1 = (ap.data as { id: string } | null)?.id as string;
  ok((ap.data as { default_country?: string } | null)?.default_country === "ro", "default_country='ro'");
  ok(Boolean((ap.data as { created_at?: string } | null)?.created_at), "created_at setat");
  const p2res = await admin.from("seo_projects").insert({ name: "zz p2" }).select("id").single();
  const p2 = (p2res.data as { id: string } | null)?.id as string;

  ok((await admin.from("seo_projects").select("id").eq("id", p1)).data?.length === 1, "admin: poate citi");
  const anSel = await anon.from("seo_projects").select("id").limit(1);
  ok(Boolean(anSel.error), "anon: SELECT blocat (grant revocat)", anSel.error?.code);
  ok(Boolean((await anon.from("seo_projects").insert({ name: "zz anon" })).error), "anon: INSERT blocat");
  const uSel = await user.from("seo_projects").select("id");
  ok(!uSel.error && (uSel.data as unknown[]).length === 0, "non-admin: SELECT → 0 rânduri (RLS filtrează)", uSel.error?.message);
  ok(Boolean((await user.from("seo_projects").insert({ name: "zz user" })).error), "non-admin: INSERT blocat (is_admin false)");

  // ── #3 dedup (app normalize ↔ DB unique) ──
  console.log("#3 Deduplicare:");
  const base = await admin.from("seo_keywords").insert({ project_id: p1, keyword: "Bonus Fără Depunere", keyword_normalized: NORM, country: "ro", volume: 100 }).select("id, mapping_status, status").single();
  ok(!base.error, "insert keyword de bază", base.error?.message);
  ok((base.data as { mapping_status?: string } | null)?.mapping_status === "none" && (base.data as { status?: string } | null)?.status === "new", "defaults keyword (mapping_status='none', status='new')");
  // app normalization produces the SAME key for every display variant:
  const variants = ["bonus fara depunere", "BONUS FARA DEPUNERE", "Bonus  Fără   Depunere", "  bonus fără depunere  "];
  const allNorm = variants.every((v) => normalizeKeyword(v) === NORM);
  ok(allNorm, "app: toate variantele (case/diacritice/spații) → aceeași cheie normalizată");
  // each duplicate (same project+ro) → 23505
  for (const v of variants) {
    const d = await admin.from("seo_keywords").insert({ project_id: p1, keyword: v, keyword_normalized: normalizeKeyword(v), country: "ro" });
    ok(d.error?.code === "23505", `DB: dup „${v.trim()}” în p1/ro → 23505`, d.error?.code);
  }
  // same keyword in a DIFFERENT project → allowed
  ok(!(await admin.from("seo_keywords").insert({ project_id: p2, keyword: "Bonus Fără Depunere", keyword_normalized: NORM, country: "ro" })).error, "același keyword în alt proiect → permis");
  // same keyword in a DIFFERENT country → allowed
  ok(!(await admin.from("seo_keywords").insert({ project_id: p1, keyword: "Bonus Fără Depunere", keyword_normalized: NORM, country: "en" })).error, "același keyword, altă țară → permis");

  // ── #4 integritate: checks, FK set null, cascade, trigger ──
  console.log("#4 Integritate:");
  ok(Boolean((await admin.from("seo_keywords").insert({ project_id: p1, keyword: "x", keyword_normalized: "x1", country: "ro", mapping_status: "bogus" })).error), "check: mapping_status invalid respins");
  ok(Boolean((await admin.from("seo_imports").insert({ project_id: p1, source: "bogus" })).error), "check: import.source invalid respins");
  ok(!(await admin.from("seo_keywords").insert({ project_id: p1, keyword: "null-metrics", keyword_normalized: "null-metrics", country: "ro", volume: null, difficulty: null })).error, "NULL permis pe metrici (volume/difficulty)");
  // FK set null: keyword.import_id → null on import delete
  const imp = await admin.from("seo_imports").insert({ project_id: p1, source: "ahrefs" }).select("id").single();
  const impId = (imp.data as { id: string } | null)?.id;
  const kForImp = await admin.from("seo_keywords").insert({ project_id: p1, keyword: "with-import", keyword_normalized: "with-import", country: "ro", import_id: impId }).select("id").single();
  const kImpId = (kForImp.data as { id: string } | null)?.id;
  await admin.from("seo_imports").delete().eq("id", impId);
  ok((await svc.from("seo_keywords").select("import_id").eq("id", kImpId).single()).data?.import_id === null, "FK SET NULL: ștergere import → keyword.import_id = NULL");
  // trigger updated_at
  const beforeU = (await svc.from("seo_keywords").select("updated_at").eq("id", kImpId).single()).data?.updated_at;
  await new Promise((r) => setTimeout(r, 1100));
  await admin.from("seo_keywords").update({ volume: 5 }).eq("id", kImpId);
  ok((await svc.from("seo_keywords").select("updated_at").eq("id", kImpId).single()).data?.updated_at !== beforeU, "trigger updated_at modifică la UPDATE");
  // cascade: delete project → its keywords gone
  await admin.from("seo_projects").delete().eq("id", p1);
  ok(((await svc.from("seo_keywords").select("id").eq("project_id", p1)).data as unknown[] | null)?.length === 0, "FK CASCADE: ștergere proiect → keywordurile dispar");
  await admin.from("seo_projects").delete().eq("id", p2);

  // cleanup
  for (const u of createdUsers) await svc.auth.admin.deleteUser(u);
  const resid = (await svc.from("seo_projects").select("id", { count: "exact", head: true }).like("name", "zz %")).count ?? 0;
  console.log(`  (cleanup: proiecte reziduale zz=${resid})`);
  ok(resid === 0, "cleanup complet (0 reziduuri)");

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  for (const u of createdUsers) await svc.auth.admin.deleteUser(u).catch(() => {});
  console.error("EROARE E2E:", e.message);
  process.exit(1);
});
