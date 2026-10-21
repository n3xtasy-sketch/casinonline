#!/usr/bin/env -S npx tsx
/**
 * import_create_row atomicity + EXECUTE-permission tests — DEV ONLY.
 * Creates only throwaway casinos (slug zz-cr-*), cleans up in finally with a
 * post-cleanup check. Also verifies anon can no longer execute the 3 RPCs (0023).
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   npx tsx scripts/dev-create-perms-test.mts
 */
const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_ANON_KEY!;
if (!URL || !SVC) { console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)."); process.exit(2); }
if (URL.includes("rmnltqmmemqfgvjglzqa")) { console.error("REFUZ: URL de PRODUCȚIE. Rulează doar pe DEV."); process.exit(2); }

const h = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
async function rest(path: string, init: RequestInit = {}, key = SVC) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...h(key), ...(init.headers ?? {}) } });
  const txt = await r.text();
  let body: unknown = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { ok: r.ok, status: r.status, body };
}
const rpc = (name: string, params: unknown, key = SVC) =>
  rest(`rpc/${name}`, { method: "POST", body: JSON.stringify(params) }, key);
const exists = async (slug: string) =>
  ((await rest(`casinos?slug=eq.${slug}&select=id,status`)).body as { id: string; status: string }[])?.[0] ?? null;
const tagCount = async (slug: string) => {
  const row = await exists(slug);
  if (!row) return 0;
  return ((await rest(`casino_tags?casino_id=eq.${row.id}&select=tag_id`)).body as unknown[]).length;
};
const msg = (b: unknown) => JSON.stringify(b ?? "");

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${detail ? " · " + detail : ""}`);
  if (ok) pass++; else fail++;
}
const PFX = "zz-cr-";
const BAD = "00000000-0000-0000-0000-0000000000ff";

async function cleanup() {
  const { body } = await rest(`casinos?slug=like.${PFX}*&select=id`);
  const ids = ((body as { id: string }[]) ?? []).map((r) => r.id);
  if (ids.length) {
    await rest(`casino_tags?casino_id=in.(${ids.map((x) => `"${x}"`).join(",")})`, { method: "DELETE" });
    await rest(`casinos?id=in.(${ids.map((x) => `"${x}"`).join(",")})`, { method: "DELETE" });
  }
  return ids.length;
}

async function main() {
  console.log(`== DEV import_create_row + perms · ${URL.replace(/https:\/\/([a-z0-9]+).*/, "$1")} ==`);

  const probe = await rpc("import_create_row", { p_table: "__none__", p_row: {}, p_junctions: [] });
  if (probe.status === 404 || (probe.body as { code?: string })?.code === "PGRST202") {
    console.error("import_create_row lipsește în DEV. Rulează 0023 în SQL editor-ul DEV mai întâi.");
    process.exit(3);
  }
  check("whitelist: tabel nepermis respins", !probe.ok && msg(probe.body).includes("not allowed"));

  await cleanup();
  const tagId = ((await rest(`tags?select=id&limit=1`)).body as { id: string }[])?.[0]?.id;
  if (!tagId) { console.error("Nu există tag-uri în DEV."); process.exit(3); }

  try {
    // 1) CREATE simplu → draft, returnează uuid
    const r1 = await rpc("import_create_row", {
      p_table: "casinos", p_row: { slug: `${PFX}simple`, name: "CR Simple", offer_url: `/go/${PFX}simple` }, p_junctions: [],
    });
    check("CREATE simplu → fără eroare + uuid", r1.ok && typeof r1.body === "string", msg(r1.body).slice(0, 60));
    const s1 = await exists(`${PFX}simple`);
    check("CREATE simplu → rând creat ca draft", s1?.status === "draft");

    // 2) CREATE cu relație → rând + junction
    const r2 = await rpc("import_create_row", {
      p_table: "casinos", p_row: { slug: `${PFX}rel`, name: "CR Rel", offer_url: `/go/${PFX}rel` },
      p_junctions: [{ table: "casino_tags", self_col: "casino_id", other_col: "tag_id", ids: [tagId] }],
    });
    check("CREATE cu relație → fără eroare", r2.ok);
    check("CREATE cu relație → rând + relație create", (await exists(`${PFX}rel`)) !== null && (await tagCount(`${PFX}rel`)) === 1);

    // 3) CREATE cu relație invalidă → rollback complet (niciun rând, nicio relație)
    const r3 = await rpc("import_create_row", {
      p_table: "casinos", p_row: { slug: `${PFX}rollback`, name: "CR Rollback", offer_url: `/go/${PFX}rollback` },
      p_junctions: [{ table: "casino_tags", self_col: "casino_id", other_col: "tag_id", ids: [BAD] }],
    });
    check("CREATE relație invalidă → eroare", !r3.ok, msg(r3.body).slice(0, 80));
    check("rollback: rândul NU a fost creat", (await exists(`${PFX}rollback`)) === null);

    // 4) CREATE cu status forțat published → respins (coloană ne-whitelisted)
    const r4 = await rpc("import_create_row", {
      p_table: "casinos", p_row: { slug: `${PFX}status`, name: "CR Status", status: "published" }, p_junctions: [],
    });
    check("CREATE status=published → respins", !r4.ok && msg(r4.body).includes("not allowed"));
    check("CREATE status respins → niciun rând", (await exists(`${PFX}status`)) === null);

    // 5) CREATE cu coloană nepermisă
    const r5 = await rpc("import_create_row", {
      p_table: "casinos", p_row: { slug: `${PFX}col`, name: "X", created_at: "2020-01-01" }, p_junctions: [],
    });
    check("CREATE coloană nepermisă → respins", !r5.ok && msg(r5.body).includes("not allowed"));

    // 6) CREATE cu junction neautorizat pentru tabel
    const r6 = await rpc("import_create_row", {
      p_table: "casinos", p_row: { slug: `${PFX}junc`, name: "X", offer_url: `/go/${PFX}junc` },
      p_junctions: [{ table: "casino_games", self_col: "game_id", other_col: "casino_id", ids: [tagId] }],
    });
    check("CREATE junction neautorizat → respins", !r6.ok && msg(r6.body).includes("not allowed"));
    check("CREATE junction respins → rollback (niciun rând)", (await exists(`${PFX}junc`)) === null);

    // 7) anon NU mai poate executa cele 3 RPC-uri (0023 revoke). Parametri VALIZI,
    //    ca să distingem „permission denied" (fără EXECUTE) de o nepotrivire de argumente.
    const anonParams: Record<string, unknown> = {
      sync_junction: { p_table: "casino_tags", p_self_col: "casino_id", p_self_id: BAD, p_other_col: "tag_id", p_other_ids: [] },
      import_apply_row: { p_table: "casinos", p_id: BAD, p_patch: {}, p_junctions: [] },
      import_create_row: { p_table: "casinos", p_row: {}, p_junctions: [] },
    };
    for (const fn of Object.keys(anonParams)) {
      const a = await rpc(fn, anonParams[fn], ANON);
      check(`anon NU poate executa ${fn}`, !a.ok && /permission denied/i.test(msg(a.body)), `http ${a.status}`);
    }
  } finally {
    const n = await cleanup();
    const left = ((await rest(`casinos?slug=like.${PFX}*&select=slug`)).body as unknown[]).length;
    console.log(`  (cleanup: ${n} șterse · reziduale: ${left})`);
    if (left > 0) { console.error("❌ DATE REZIDUALE!"); fail++; }
  }

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
