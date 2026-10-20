import { test } from "node:test";
import assert from "node:assert/strict";
import { syncJunctionAtomic, type RpcRunner } from "./junction-sync";

function mockRpc(result: { error: { message: string } | null }) {
  const calls: { name: string; params: Record<string, unknown> }[] = [];
  const rpc: RpcRunner = async (name, params) => {
    calls.push({ name, params });
    return result;
  };
  return { rpc, calls };
}

test("syncJunctionAtomic: succes → null, apel RPC cu parametri corecți + dedup", async () => {
  const m = mockRpc({ error: null });
  const r = await syncJunctionAtomic(m.rpc, "casino_tags", "casino_id", "c1", "tag_id", ["t1", "t2", "t1", ""]);
  assert.equal(r, null);
  assert.equal(m.calls.length, 1);
  assert.equal(m.calls[0].name, "sync_junction");
  assert.equal(m.calls[0].params.p_table, "casino_tags");
  assert.equal(m.calls[0].params.p_self_col, "casino_id");
  assert.equal(m.calls[0].params.p_other_col, "tag_id");
  assert.deepEqual(m.calls[0].params.p_other_ids, ["t1", "t2"]); // dedup + fără string gol
});

test("syncJunctionAtomic: eroare la ștergere (RPC) → mesaj de eroare, NU succes", async () => {
  const m = mockRpc({ error: { message: "delete failed" } });
  const r = await syncJunctionAtomic(m.rpc, "casino_games", "casino_id", "c1", "game_id", ["g1"]);
  assert.match(r ?? "", /Eroare la salvarea relațiilor \(casino_games\)/);
  assert.match(r ?? "", /delete failed/);
});

test("syncJunctionAtomic: eroare la inserare (RPC) → mesaj de eroare", async () => {
  const m = mockRpc({ error: { message: "insert fk violation" } });
  const r = await syncJunctionAtomic(m.rpc, "casino_games", "game_id", "g1", "casino_id", ["c1"]);
  assert.ok(r);
  assert.match(r, /insert fk violation/);
});

test("syncJunctionAtomic: pe eroare relațiile se păstrează (RPC atomic) → eșec semnalat", async () => {
  // RPC-ul rulează delete+insert într-o singură tranzacție: la eroare, delete-ul
  // este anulat de Postgres → relațiile existente rămân. Unit-test: ne asigurăm că
  // wrapper-ul semnalează eșecul (caller-ul NU va raporta succes / nu va face redirect).
  const m = mockRpc({ error: { message: "boom" } });
  assert.notEqual(
    await syncJunctionAtomic(m.rpc, "casino_tags", "casino_id", "c1", "tag_id", ["t1"]),
    null,
  );
});

test("syncJunctionAtomic: listă goală → RPC cu p_other_ids=[] → null (șterge tot, inserează nimic)", async () => {
  const m = mockRpc({ error: null });
  const r = await syncJunctionAtomic(m.rpc, "casino_payment_methods", "payment_method_id", "p1", "casino_id", []);
  assert.equal(r, null);
  assert.equal(m.calls.length, 1);
  assert.deepEqual(m.calls[0].params.p_other_ids, []);
});

test("syncJunctionAtomic: lipsă permisiuni (RLS) → eroare surfacată", async () => {
  const m = mockRpc({
    error: { message: 'new row violates row-level security policy for table "casino_tags"' },
  });
  const r = await syncJunctionAtomic(m.rpc, "casino_tags", "casino_id", "c1", "tag_id", ["t1"]);
  assert.match(r ?? "", /row-level security/);
});
