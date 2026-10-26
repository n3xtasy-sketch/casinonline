#!/usr/bin/env -S npx tsx
/**
 * Faza 3 / Etapa 1 — affiliate redirect resolution E2E. DEV ONLY.
 * Needs migrations 0028 + 0029 in DEV (self-checks, exits if not).
 * Throwaway rows only (slug zz-af3-*), cleanup in finally + post-check.
 * Usage: set -a; . ./.env.local; set +a; npx tsx scripts/dev-affiliate-faza3-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SVC) { console.error("Lipsește SUPABASE_URL / SERVICE_ROLE_KEY (.env.local)."); process.exit(2); }
if (URL.includes("rmnltqmmemqfgvjglzqa")) { console.error("REFUZ: PRODUCȚIE. Doar DEV."); process.exit(2); }
const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
const P = "zz-af3-";

let pass = 0, fail = 0;
function check(n: string, ok: boolean, d = "") { console.log(`  ${ok ? "✅" : "❌"} ${n}${d ? " · " + d : ""}`); if (ok) pass++; else fail++; }
const resolveBonus = async (cas: string, bon: string) => (await db.rpc("get_bonus_affiliate_url", { p_casino_slug: cas, p_bonus_slug: bon })).data as string | null;
const resolveCasino = async (cas: string) => (await db.rpc("get_affiliate_url", { p_slug: cas })).data as string | null;

async function cleanup() {
  const { data } = await db.from("casinos").select("id").like("slug", `${P}%`);
  const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
  if (ids.length) {
    await db.from("bonuses").delete().in("casino_id", ids);          // FK → affiliate_links + casinos
    await db.from("affiliate_links").delete().in("casino_id", ids);
    await db.from("casinos").delete().in("id", ids);
  }
  return ids.length;
}
async function mkCasino(slug: string) {
  // published: get_affiliate_url resolves only published casinos (draft → null → fallback)
  const { data, error } = await db.from("casinos").insert({ slug, name: slug, status: "published", offer_url: `/go/${slug}` }).select("id").single();
  if (error) throw new Error(`casino ${slug}: ${error.message}`);
  return (data as { id: string }).id;
}
async function mkLink(casinoId: string, placement: string, url: string, is_active: boolean, campaign: string | null = null) {
  const { data, error } = await db.from("affiliate_links").insert({ casino_id: casinoId, placement, url, is_active, campaign }).select("id").single();
  if (error) throw new Error(`link ${url}: ${error.message}`);
  return (data as { id: string }).id;
}
async function mkBonus(slug: string, casinoId: string, affiliate_link_id: string | null) {
  const { error } = await db.from("bonuses").insert({ slug, casino_id: casinoId, offer: "TEST", status: "draft", claim_url: `/go/x/${slug}`, affiliate_link_id });
  if (error) throw new Error(`bonus ${slug}: ${error.message}`);
}

async function main() {
  console.log(`== Faza3 affiliate E2E · ${URL.replace(/https:\/\/([a-z0-9]+).*/, "$1")} ==`);
  const col = await db.from("bonuses").select("affiliate_link_id").limit(1);
  if (col.error) { console.error("Coloana affiliate_link_id lipsește → aplică 0028 în DEV.", col.error.message); process.exit(3); }
  const rpcProbe = await db.rpc("get_bonus_affiliate_url", { p_casino_slug: "__none__", p_bonus_slug: "__none__" });
  if (rpcProbe.error && /PGRST202|not find/i.test(rpcProbe.error.message)) { console.error("RPC get_bonus_affiliate_url lipsește → aplică 0029 în DEV."); process.exit(3); }

  const casBaseline = ((await db.from("casinos").select("id").not("slug", "like", `${P}%`)).data as unknown[] ?? []).length;
  const bonBaseline = ((await db.from("bonuses").select("id").not("slug", "like", `${P}%`)).data as unknown[] ?? []).length;
  await cleanup();
  try {
    const A = await mkCasino(`${P}casa`), B = await mkCasino(`${P}casb`);
    await mkCasino(`${P}casc`); // casino with no link (resolved by slug below)
    const aMain = "https://a.example/main", aBonus = "https://a.example/bonus";
    const linkAmain = await mkLink(A, "review_cta", aMain, true);
    const linkAbonus = await mkLink(A, "bonus_claim", aBonus, true, "promo");
    const linkAoff = await mkLink(A, "bonus_claim", "https://a.example/off", false, "off");
    await mkLink(B, "review_cta", "https://b.example/main", true);
    await mkBonus(`${P}b1`, A, linkAbonus); // own active link
    await mkBonus(`${P}b2`, A, null);        // no link → casino default
    await mkBonus(`${P}b3`, A, linkAoff);    // own INACTIVE link → casino default
    await mkBonus(`${P}bB`, B, null);        // casB bonus (for cross-casino FK test)

    check("cazino cu link principal activ → /go/casa", (await resolveCasino(`${P}casa`)) === aMain);
    check("cazino FĂRĂ link → NULL (fallback)", (await resolveCasino(`${P}casc`)) === null);
    check("bonus cu link propriu activ → link bonus", (await resolveBonus(`${P}casa`, `${P}b1`)) === aBonus);
    check("bonus FĂRĂ link → default cazinou", (await resolveBonus(`${P}casa`, `${P}b2`)) === aMain);
    check("bonus cu link propriu INACTIV → default cazinou", (await resolveBonus(`${P}casa`, `${P}b3`)) === aMain);
    check("bonus INEXISTENT → NULL (NU linkul principal; fallback recenzie)", (await resolveBonus(`${P}casa`, `${P}nope`)) === null);
    check("bonus al ALTUI cazinou în URL → NULL (NU linkul principal)", (await resolveBonus(`${P}casb`, `${P}b1`)) === null);
    check("cazinou inexistent în ruta de bonus → NULL", (await resolveBonus(`${P}nocasino`, `${P}b1`)) === null);
    check("cazinou inexistent (rută cazino) → NULL", (await resolveCasino(`${P}nocasino`)) === null);

    // cross-casino: setează pe un bonus din casB un link din casA → FK trebuie să respingă
    const cross = await db.from("bonuses").update({ affiliate_link_id: linkAmain }).eq("slug", `${P}bB`);
    check("link din alt cazinou → RESPINS la nivel DB (FK compozit)", cross.error !== null, cross.error?.message?.slice(0, 60) ?? "");

    // URL invalid (non-https) → CHECK respinge
    const badUrl = await db.from("affiliate_links").insert({ casino_id: A, placement: "listing_card", url: "http://insecure.example", is_active: true });
    check("URL non-https → RESPINS (CHECK)", badUrl.error !== null, badUrl.error?.message?.slice(0, 50) ?? "");
  } finally {
    const n = await cleanup();
    const left = ((await db.from("casinos").select("slug").like("slug", `${P}%`)).data as unknown[] ?? []).length;
    const casAfter = ((await db.from("casinos").select("id").not("slug", "like", `${P}%`)).data as unknown[] ?? []).length;
    const bonAfter = ((await db.from("bonuses").select("id").not("slug", "like", `${P}%`)).data as unknown[] ?? []).length;
    console.log(`  (cleanup: ${n} cazinouri test șterse · reziduale: ${left} · cazinouri reale: ${casBaseline}→${casAfter} · bonusuri reale: ${bonBaseline}→${bonAfter})`);
    if (left > 0 || casAfter !== casBaseline || bonAfter !== bonBaseline) { console.error("❌ reziduuri / date reale modificate!"); fail++; }
  }
  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
