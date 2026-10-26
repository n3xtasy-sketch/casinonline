#!/usr/bin/env -S npx tsx
/**
 * Faza 3 — Etapa 2 DEV E2E: the 0031 atomic create_bonus_affiliate_link RPC.
 * Refuses non-DEV. Creates a throwaway admin user + authenticated session (the RPC is
 * is_admin()-gated, which service_role does NOT satisfy). Cleans everything up in finally.
 *
 * Usage: set -a; . ./.env.local; set +a; npx tsx scripts/dev-affiliate-etapa2-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_ANON_KEY!;
if (!URL || !SVC || !ANON) {
  console.error("Lipsește SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY (.env.local).");
  process.exit(2);
}
if (!URL.includes("radhontyxrzjeatsaccg")) {
  console.error(`⛔ Nu e DEV (${URL}). Refuz.`);
  process.exit(2);
}

const svc = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;

let pass = 0;
let fail = 0;
function ok(cond: boolean, label: string, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${extra ? ` · ${extra}` : ""}`);
  }
}

const TAG = "zz-e2";
const email = `${TAG}-admin@example.com`;
const password = "zz-Test-Pass-123456";

async function mkCasino(slug: string): Promise<string> {
  const { data, error } = await svc
    .from("casinos")
    .insert({ slug, name: slug, status: "published", offer_url: `/go/${slug}` })
    .select("id")
    .single();
  if (error) throw new Error(`mkCasino ${slug}: ${error.message}`);
  return (data as { id: string }).id;
}
async function mkBonus(slug: string, casinoId: string): Promise<string> {
  const { data, error } = await svc
    .from("bonuses")
    .insert({ slug, casino_id: casinoId, offer: slug, status: "draft", claim_url: `/go/x/${slug}` })
    .select("id")
    .single();
  if (error) throw new Error(`mkBonus ${slug}: ${error.message}`);
  return (data as { id: string }).id;
}
async function linkIdOf(bonusId: string): Promise<string | null> {
  const { data } = await svc.from("bonuses").select("affiliate_link_id").eq("id", bonusId).maybeSingle();
  return (data as { affiliate_link_id: string | null } | null)?.affiliate_link_id ?? null;
}
async function countLinks(casinoId: string): Promise<number> {
  const { count } = await svc
    .from("affiliate_links")
    .select("id", { count: "exact", head: true })
    .eq("casino_id", casinoId);
  return count ?? 0;
}

async function main() {
  // ── setup: admin user + session ──────────────────────────────────────────
  const created = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error(`createUser: ${created.error.message}`);
  const userId = created.data.user!.id;
  await svc.from("profiles").update({ is_admin: true }).eq("id", userId);

  const admin = createClient(URL, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  const signIn = await admin.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`signIn: ${signIn.error.message}`);
  const anon = createClient(URL, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;

  const casA = await mkCasino(`${TAG}-cas-a`);
  const casB = await mkCasino(`${TAG}-cas-b`);

  const rpc = (c: SupabaseClient, args: Record<string, unknown>) =>
    c.rpc("create_bonus_affiliate_link", args);

  console.log(`== Etapa2 RPC E2E · ${URL.split("//")[1].split(".")[0]} ==`);

  // 1. creare link + asociere reușită
  const b1 = await mkBonus(`${TAG}-b1`, casA);
  const r1 = await rpc(admin, { p_bonus_id: b1, p_casino_id: casA, p_url: "https://aff.example/promo", p_placement: "bonus_claim", p_campaign: "welcome" });
  const link1 = r1.data as string | null;
  ok(!r1.error && typeof link1 === "string" && (await linkIdOf(b1)) === link1, "1. creare link + asociere reușită", r1.error?.message);

  // 2. reutilizare link compatibil (același casino+url+placement+campaign)
  const b2 = await mkBonus(`${TAG}-b2`, casA);
  const r2 = await rpc(admin, { p_bonus_id: b2, p_casino_id: casA, p_url: "https://aff.example/promo", p_placement: "bonus_claim", p_campaign: "welcome" });
  ok(!r2.error && r2.data === link1, "2. reutilizare link compatibil (fără duplicat)", r2.error?.message ?? String(r2.data));

  // 3. link existent cu ALTĂ campanie → link distinct (nu reutilizează)
  const b3 = await mkBonus(`${TAG}-b3`, casA);
  const r3 = await rpc(admin, { p_bonus_id: b3, p_casino_id: casA, p_url: "https://aff.example/promo", p_placement: "bonus_claim", p_campaign: "summer" });
  ok(!r3.error && typeof r3.data === "string" && r3.data !== link1, "3. altă campanie → link nou distinct", r3.error?.message);

  // 4. bonus aparținând altui cazinou → P0002 + rollback (niciun link nou pe casB)
  const b4 = await mkBonus(`${TAG}-b4`, casB);
  const before4 = await countLinks(casB);
  const r4 = await rpc(admin, { p_bonus_id: b4, p_casino_id: casA, p_url: "https://aff.example/cross", p_placement: "bonus_claim", p_campaign: null });
  const after4 = await countLinks(casB);
  ok(Boolean(r4.error) && before4 === after4 && (await linkIdOf(b4)) === null, "4. bonus alt cazino → eroare + rollback (fără orfan)", r4.error?.message);

  // 5. bonus inexistent → P0002 + rollback
  const fakeBonus = "00000000-0000-0000-0000-000000000000";
  const before5 = await countLinks(casA);
  const r5 = await rpc(admin, { p_bonus_id: fakeBonus, p_casino_id: casA, p_url: "https://aff.example/ghost", p_placement: "bonus_claim", p_campaign: "ghost" });
  const after5 = await countLinks(casA);
  ok(Boolean(r5.error) && before5 === after5, "5. bonus inexistent → eroare + rollback (fără orfan)", r5.error?.message);

  // 6. utilizator neautorizat: anon (EXECUTE revocat) + service_role (is_admin() false)
  const rAnon = await rpc(anon, { p_bonus_id: b1, p_casino_id: casA, p_url: "https://aff.example/x", p_placement: "bonus_claim", p_campaign: null });
  ok(Boolean(rAnon.error), "6a. anon respins (EXECUTE revocat)", rAnon.error?.message);
  const rSvc = await rpc(svc, { p_bonus_id: b1, p_casino_id: casA, p_url: "https://aff.example/x", p_placement: "bonus_claim", p_campaign: null });
  ok(Boolean(rSvc.error), "6b. service_role respins (is_admin() false)", rSvc.error?.message);

  // 7. validare HTTPS + placement
  const rHttp = await rpc(admin, { p_bonus_id: b1, p_casino_id: casA, p_url: "http://insecure.example", p_placement: "bonus_claim", p_campaign: null });
  ok(Boolean(rHttp.error), "7a. URL non-https respins", rHttp.error?.message);
  const rPl = await rpc(admin, { p_bonus_id: b1, p_casino_id: casA, p_url: "https://aff.example/y", p_placement: "nope", p_campaign: null });
  ok(Boolean(rPl.error), "7b. placement invalid respins", rPl.error?.message);

  // 8. cereri concurente: 2 apeluri identice simultane → un singur link, același id
  const b8a = await mkBonus(`${TAG}-b8a`, casB);
  const b8b = await mkBonus(`${TAG}-b8b`, casB);
  const beforeC = await countLinks(casB);
  const [c1, c2] = await Promise.all([
    rpc(admin, { p_bonus_id: b8a, p_casino_id: casB, p_url: "https://aff.example/conc", p_placement: "bonus_claim", p_campaign: "conc" }),
    rpc(admin, { p_bonus_id: b8b, p_casino_id: casB, p_url: "https://aff.example/conc", p_placement: "bonus_claim", p_campaign: "conc" }),
  ]);
  const afterC = await countLinks(casB);
  const bothOk = !c1.error && !c2.error && typeof c1.data === "string" && c1.data === c2.data;
  ok(bothOk && afterC - beforeC === 1, "8. concurență: un singur link, același id, fără duplicat",
    `${c1.error?.message ?? ""} ${c2.error?.message ?? ""} Δlinks=${afterC - beforeC}`);

  // cleanup
  await svc.from("bonuses").delete().like("slug", `${TAG}-%`);
  await svc.from("affiliate_links").delete().in("casino_id", [casA, casB]);
  await svc.from("casinos").delete().in("id", [casA, casB]);
  await svc.auth.admin.deleteUser(userId);

  const residBon = (await svc.from("bonuses").select("id", { count: "exact", head: true }).like("slug", `${TAG}-%`)).count ?? 0;
  const residLink = (await countLinks(casA)) + (await countLinks(casB));
  console.log(`  (cleanup: reziduale bonusuri=${residBon} · linkuri=${residLink})`);
  ok(residBon === 0 && residLink === 0, "9. cleanup complet (0 reziduale)");

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("EROARE E2E:", e.message);
  process.exit(1);
});
