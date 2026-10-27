#!/usr/bin/env -S npx tsx
/**
 * Faza 3 — Etapa 3 DEV E2E: affiliate_links CSV import (dedicated module).
 * Runs the REAL dryRunAffiliate/applyAffiliate against DEV, under an AUTHENTICATED
 * ADMIN session (import never uses service_role). service_role is used only for
 * fixture setup + teardown. Cleans everything up in finally. Refuses non-DEV.
 *
 * Usage: set -a; . ./.env.local; set +a; npx tsx scripts/dev-affiliate-csv-etapa3-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dryRunAffiliate, applyAffiliate } from "@/lib/io/affiliate-import";
import { exportEntity } from "@/lib/io/pipeline";

const exportAffiliateViaPipeline = (db: SupabaseClient) => exportEntity(db, "affiliate_links", "csv", {});

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_ANON_KEY!;
if (!URL || !SVC || !ANON) { console.error("Lipsește SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY."); process.exit(2); }
if (!URL.includes("radhontyxrzjeatsaccg")) { console.error(`⛔ Nu e DEV (${URL}). Refuz.`); process.exit(2); }

const svc = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;

let pass = 0, fail = 0;
function ok(cond: boolean, label: string, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}${extra ? ` · ${extra}` : ""}`); }
}
const TAG = "zz-csv3";
const email = `${TAG}-admin@example.com`;
const password = "zz-Test-Pass-123456";

async function mkCasino(slug: string): Promise<string> {
  const { data, error } = await svc.from("casinos").insert({ slug, name: slug, status: "published", offer_url: `/go/${slug}` }).select("id").single();
  if (error) throw new Error(`mkCasino ${slug}: ${error.message}`);
  return (data as { id: string }).id;
}
async function links(casinoId: string) {
  const { data } = await svc.from("affiliate_links").select("id, placement, url, campaign, is_active").eq("casino_id", casinoId).order("placement");
  return (data as { id: string; placement: string; url: string; campaign: string | null; is_active: boolean }[]) ?? [];
}

async function main() {
  // admin session (imports run as THIS, never service_role)
  const created = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error(created.error.message);
  const userId = created.data.user!.id;
  await svc.from("profiles").update({ is_admin: true }).eq("id", userId);
  const admin = createClient(URL, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  const si = await admin.auth.signInWithPassword({ email, password });
  if (si.error) throw new Error(si.error.message);

  const casA = await mkCasino(`${TAG}-a`);
  const casB = await mkCasino(`${TAG}-b`);

  const dry = (csv: string, mode: "create" | "upsert" = "upsert") => dryRunAffiliate(admin, csv, mode);
  const apply = async (csv: string, mode: "create" | "upsert" = "upsert") => {
    const d = await dry(csv, mode);
    if ("error" in d) return { error: d.error };
    return applyAffiliate(admin, csv, d.hash, mode, d.conflictTokens);
  };

  console.log("== Etapa3 CSV affiliate E2E · DEV ==");

  // 1. CREATE
  const c1 = await apply(`casino_slug,placement,url,campaign,is_active\n${TAG}-a,review_cta,https://a.example/main,,true`);
  ok(!("error" in c1) && c1.created === 1, "1. CREATE link nou", JSON.stringify(c1));
  const L = await links(casA);
  ok(L.length === 1 && L[0].url === "https://a.example/main", "1b. link persistat corect");

  // 2. UPSERT by natural key → update url
  const c2 = await apply(`casino_slug,placement,url,campaign,is_active\n${TAG}-a,review_cta,https://a.example/CHANGED,,true`);
  ok(!("error" in c2) && c2.updated === 1, "2. UPSERT după cheie naturală (update url)", JSON.stringify(c2));

  // 3. Export → reimport fără modificări = 100% UNCHANGED (incl. inactive)
  await svc.from("affiliate_links").insert([
    { casino_id: casA, placement: "bonus_claim", url: "https://a.example/promo", campaign: "welcome", is_active: true },
    { casino_id: casA, placement: "listing_card", url: "https://a.example/dead", campaign: null, is_active: false },
  ]);
  const exported = await exportAffiliateViaPipeline(admin);
  const d3 = await dry(exported);
  const unchangedAll = !("error" in d3) && d3.toUnchanged === d3.total && d3.toCreate === 0 && d3.toUpdate === 0 && d3.errors === 0;
  ok(unchangedAll, "3. export→reimport = 100% UNCHANGED (incl. inactive)", JSON.stringify("error" in d3 ? d3 : { t: d3.total, u: d3.toUnchanged, c: d3.toCreate, up: d3.toUpdate }));

  // 4. ambiguitate: 2 inactive cu aceeași cheie, fără id
  await svc.from("affiliate_links").insert({ casino_id: casA, placement: "listing_card", url: "https://a.example/dead2", campaign: null, is_active: false });
  const d4 = await dry(`casino_slug,placement,url,campaign,is_active\n${TAG}-a,listing_card,https://a.example/x,,false`);
  const amb = !("error" in d4) && d4.rows[0].level === "error" && d4.rows[0].messages.join(" ").includes("ambigu");
  ok(amb, "4. cheie naturală ambiguă fără id → ERROR", JSON.stringify("error" in d4 ? d4 : d4.rows[0]));

  // 5. __CLEAR__ campaign (by id)
  const promo = (await links(casA)).find((x) => x.campaign === "welcome")!;
  const c5 = await apply(`id,casino_slug,placement,url,campaign,is_active\n${promo.id},${TAG}-a,bonus_claim,https://a.example/promo,__CLEAR__,true`);
  const promoAfter = (await links(casA)).find((x) => x.id === promo.id)!;
  ok(!("error" in c5) && c5.updated === 1 && promoAfter.campaign === null, "5. __CLEAR__ golește campaign", JSON.stringify(c5));

  // 6. casino inexistent / URL non-https / placement invalid → ERROR (nimic aplicat)
  const d6 = await dry(`casino_slug,placement,url,campaign,is_active\nghost,review_cta,https://x,,true\n${TAG}-b,nope,https://b.example,,true\n${TAG}-b,review_cta,http://insecure,,true`);
  const allErr = !("error" in d6) && d6.errors === 3 && d6.toCreate === 0;
  ok(allErr, "6. casino inexistent + placement invalid + non-https → 3 ERROR", JSON.stringify("error" in d6 ? d6 : { e: d6.errors }));

  // 7. idempotență: reaplici exact același export → tot UNCHANGED (0 scrieri)
  const exported2 = await exportAffiliateViaPipeline(admin);
  const c7 = await apply(exported2);
  ok(!("error" in c7) && c7.created === 0 && c7.updated === 0 && c7.unchanged === c7.rows.length, "7. idempotent: reimport = 0 create / 0 update", JSON.stringify(c7));

  // 8. conflict dry-run↔apply: modific linkul între dry-run și apply → nesuprascris
  const main = (await links(casA)).find((x) => x.placement === "review_cta")!;
  const csv8 = `id,casino_slug,placement,url,campaign,is_active\n${main.id},${TAG}-a,review_cta,https://a.example/FROM-CSV,,true`;
  const d8 = await dry(csv8);
  if ("error" in d8) throw new Error(d8.error);
  // simulez o modificare concurentă (schimbă updated_at prin service_role)
  await svc.from("affiliate_links").update({ url: "https://a.example/CONCURRENT" }).eq("id", main.id);
  const c8 = await applyAffiliate(admin, csv8, d8.hash, "upsert", d8.conflictTokens);
  const mainAfter = (await links(casA)).find((x) => x.id === main.id)!;
  const conflictHandled = !("error" in c8) && c8.failed === 1 && mainAfter.url === "https://a.example/CONCURRENT";
  ok(conflictHandled, "8. conflict dry-run↔apply → nesuprascris", JSON.stringify("error" in c8 ? c8 : { failed: c8.failed, url: mainAfter.url, outcome: c8.rows[0]?.outcome }));

  // 9. importul NU atinge bonuses.affiliate_link_id
  const bonusId = (await svc.from("bonuses").insert({ slug: `${TAG}-bonus`, casino_id: casA, offer: "x", status: "draft", claim_url: `/go/${TAG}-a/${TAG}-bonus`, affiliate_link_id: promo.id }).select("id").single()).data as { id: string };
  await apply(`id,casino_slug,placement,url,campaign,is_active\n${promo.id},${TAG}-a,bonus_claim,https://a.example/promo-v2,,true`);
  const bAfter = (await svc.from("bonuses").select("affiliate_link_id").eq("id", bonusId.id).single()).data as { affiliate_link_id: string };
  ok(bAfter.affiliate_link_id === promo.id, "9. bonuses.affiliate_link_id NEATINS de importer");

  // cleanup
  await svc.from("bonuses").delete().like("slug", `${TAG}-%`);
  await svc.from("affiliate_links").delete().in("casino_id", [casA, casB]);
  await svc.from("casinos").delete().in("id", [casA, casB]);
  await svc.auth.admin.deleteUser(userId);
  const resid = (await svc.from("casinos").select("id", { count: "exact", head: true }).like("slug", `${TAG}-%`)).count ?? 0;
  console.log(`  (cleanup: cazinouri reziduale=${resid})`);
  ok(resid === 0, "10. cleanup complet (0 reziduale)");

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("EROARE E2E:", e.message); process.exit(1); });
