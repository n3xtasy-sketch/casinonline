#!/usr/bin/env -S npx tsx
/**
 * REAL rollback/atomicity test for import_apply_row (0022) — DEV ONLY.
 * Writes a THROWAWAY casino, exercises every path, then deletes it.
 * Usage:
 *   set -a; . ./.env.local; set +a   # DEV project — NEVER production
 *   npx tsx scripts/dev-atomicity-test.mts
 */
const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_ANON_KEY!;
if (!URL || !SVC) { console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)."); process.exit(2); }
if (URL.includes("rmnltqmmemqfgvjglzqa")) { console.error("REFUZ: URL de PRODUCȚIE. Rulează doar pe DEV."); process.exit(2); }

const h = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" });
async function rest(path: string, init: RequestInit = {}, key = SVC) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...h(key), ...(init.headers ?? {}) } });
  const txt = await r.text();
  let body: unknown = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { ok: r.ok, status: r.status, body };
}
const rpc = (name: string, params: unknown, key = SVC) =>
  rest(`rpc/${name}`, { method: "POST", body: JSON.stringify(params) }, key);
const getCasino = async (id: string) =>
  (await rest(`casinos?id=eq.${id}&select=min_deposit,status`)).body as { min_deposit: string | null; status: string }[];
const getTags = async (id: string) =>
  ((await rest(`casino_tags?casino_id=eq.${id}&select=tag_id`)).body as { tag_id: string }[]).map((r) => r.tag_id);

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${detail ? " · " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const TS = Date.now();
const slug = `zz-atom-${TS}`;
const BAD_UUID = "00000000-0000-0000-0000-0000000000ff"; // not a real tag id

async function main() {
  console.log(`== DEV atomicity test · ${URL.replace(/https:\/\/([a-z0-9]+).*/, "$1")} ==`);

  // function present?
  const probe = await rpc("import_apply_row", { p_table: "__none__", p_id: BAD_UUID, p_patch: {}, p_junctions: [] });
  if (probe.status === 404 || (probe.body as { code?: string })?.code === "PGRST202") {
    console.error("import_apply_row lipsește în DEV. Rulează 0021 + 0022 în SQL editor-ul DEV mai întâi.");
    process.exit(3);
  }
  check("whitelist: tabel nepermis respins", !probe.ok && JSON.stringify(probe.body).includes("not allowed"));

  // #1 sync_junction: combinație invalidă (casino_tags + game_id) respinsă
  const combo = await rpc("sync_junction", {
    p_table: "casino_tags", p_self_col: "game_id", p_self_id: BAD_UUID, p_other_col: "casino_id", p_other_ids: [],
  });
  check("sync_junction: combinație invalidă respinsă", !combo.ok, JSON.stringify(combo.body ?? "").slice(0, 120));

  // fixtures
  const tagRes = await rest(`tags?select=id&limit=1`);
  const tagId = (tagRes.body as { id: string }[])?.[0]?.id;
  if (!tagId) { console.error("Nu există tag-uri în DEV pentru testul de relații."); process.exit(3); }

  await rest(`casinos?slug=like.zz-atom-*`, { method: "DELETE" }); // cleanup leftovers
  const ins = await rest(`casinos`, {
    method: "POST",
    body: JSON.stringify({ slug, name: "Atomicity Test", status: "draft", min_deposit: "AAA", offer_url: `/go/${slug}` }),
  });
  const id = (ins.body as { id: string }[])?.[0]?.id;
  if (!id) { console.error("Insert casino test eșuat:", JSON.stringify(ins.body)); process.exit(3); }
  console.log(`  (casino test creat: ${slug})`);

  try {
    // 1. scalar success
    const r1 = await rpc("import_apply_row", { p_table: "casinos", p_id: id, p_patch: { min_deposit: "BBB" }, p_junctions: [] });
    check("scalar success → fără eroare", r1.ok, JSON.stringify(r1.body ?? ""));
    check("scalar success → valoare scrisă", (await getCasino(id))[0]?.min_deposit === "BBB");

    // 2. scalar + relație success
    const r2 = await rpc("import_apply_row", {
      p_table: "casinos", p_id: id, p_patch: { min_deposit: "CCC" },
      p_junctions: [{ table: "casino_tags", self_col: "casino_id", other_col: "tag_id", ids: [tagId] }],
    });
    check("scalar+relație success → fără eroare", r2.ok);
    check("scalar+relație success → scalar scris", (await getCasino(id))[0]?.min_deposit === "CCC");
    check("scalar+relație success → relație scrisă", (await getTags(id)).includes(tagId));

    // 3. ROLLBACK: junction insert eșuează (FK) → tot rândul revine
    const r3 = await rpc("import_apply_row", {
      p_table: "casinos", p_id: id, p_patch: { min_deposit: "DDD" },
      p_junctions: [{ table: "casino_tags", self_col: "casino_id", other_col: "tag_id", ids: [BAD_UUID] }],
    });
    check("rollback: RPC a dat eroare", !r3.ok, JSON.stringify(r3.body ?? ""));
    check("rollback: scalar NEMODIFICAT (încă CCC, nu DDD)", (await getCasino(id))[0]?.min_deposit === "CCC");
    check("rollback: relația veche PĂSTRATĂ (delete anulat)", (await getTags(id)).includes(tagId));

    // 4. CLEAR scalar + relații goale
    const r4 = await rpc("import_apply_row", {
      p_table: "casinos", p_id: id, p_patch: { min_deposit: null },
      p_junctions: [{ table: "casino_tags", self_col: "casino_id", other_col: "tag_id", ids: [] }],
    });
    check("CLEAR: fără eroare", r4.ok);
    check("CLEAR: scalar → NULL", (await getCasino(id))[0]?.min_deposit === null);
    check("CLEAR: relații → golite", (await getTags(id)).length === 0);

    // 5. whitelist coloană (status) respinsă + status nemodificat
    const r5 = await rpc("import_apply_row", { p_table: "casinos", p_id: id, p_patch: { status: "archived" }, p_junctions: [] });
    check("whitelist: coloană nepermisă (status) respinsă", !r5.ok && JSON.stringify(r5.body).includes("not allowed"));
    check("whitelist: status NEMODIFICAT (încă draft)", (await getCasino(id))[0]?.status === "draft");

    // 6. whitelist junction nepermis (tabel junction străin)
    const r6 = await rpc("import_apply_row", {
      p_table: "casinos", p_id: id, p_patch: {},
      p_junctions: [{ table: "profiles", self_col: "casino_id", other_col: "tag_id", ids: [tagId] }],
    });
    check("whitelist: junction nepermis respins", !r6.ok);

    // 6b. junction neautorizat pentru p_table (self_col greșit pentru casinos)
    const r6b = await rpc("import_apply_row", {
      p_table: "casinos", p_id: id, p_patch: {},
      p_junctions: [{ table: "casino_games", self_col: "game_id", other_col: "casino_id", ids: [tagId] }],
    });
    check("junction neautorizat pentru tabel respins (#2)", !r6b.ok && JSON.stringify(r6b.body).includes("not allowed"));

    // 6c. id inexistent → eșec ÎNAINTE de relații; nicio relație scrisă pentru id-ul fals (#3)
    const ghost = "00000000-0000-0000-0000-0000000000aa";
    const r6c = await rpc("import_apply_row", {
      p_table: "casinos", p_id: ghost, p_patch: { min_deposit: "GHOST" },
      p_junctions: [{ table: "casino_tags", self_col: "casino_id", other_col: "tag_id", ids: [tagId] }],
    });
    check("id inexistent → eroare (nu continuă la relații) (#3)", !r6c.ok && JSON.stringify(r6c.body).includes("not found"));
    check("id inexistent → nicio relație scrisă", (await getTags(ghost)).length === 0);

    // 7. RLS: anon nu poate modifica (fie respins la funcție, fie blocat de RLS → rând NESCHIMBAT)
    if (ANON) {
      const before = (await getCasino(id))[0]?.min_deposit;
      const r7 = await rpc("import_apply_row", {
        p_table: "casinos", p_id: id, p_patch: { min_deposit: "ANON-HACK" },
        p_junctions: [{ table: "casino_tags", self_col: "casino_id", other_col: "tag_id", ids: [tagId] }],
      }, ANON);
      const after = (await getCasino(id))[0]?.min_deposit;
      check("RLS: anon NU a modificat rândul", after === before, `status ${r7.status}`);
    } else {
      console.log("  (ANON key lipsă — sar testul RLS)");
    }
  } finally {
    await rest(`casino_tags?casino_id=eq.${id}`, { method: "DELETE" });
    await rest(`casinos?id=eq.${id}`, { method: "DELETE" });
    console.log(`  (cleanup: casino test șters)`);
  }

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
