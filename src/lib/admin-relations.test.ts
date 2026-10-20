import { test } from "node:test";
import assert from "node:assert/strict";
import { selectedJunctionIds, isOptionChecked, toggleSelection } from "./admin-relations";

test("selectedJunctionIds: încarcă selecțiile existente din rândurile de joncțiune", () => {
  const rows = [{ tag_id: "t1" }, { tag_id: "t2" }, { tag_id: "t3" }];
  assert.deepEqual(selectedJunctionIds(rows, "tag_id"), ["t1", "t2", "t3"]);
  // alte coloane
  assert.deepEqual(
    selectedJunctionIds([{ casino_id: "c1" }, { casino_id: "c2" }], "casino_id"),
    ["c1", "c2"],
  );
});

test("selectedJunctionIds: fără relații → listă goală (create = debifat)", () => {
  assert.deepEqual(selectedJunctionIds(null, "tag_id"), []);
  assert.deepEqual(selectedJunctionIds([], "tag_id"), []);
});

test("isOptionChecked: bifat dacă relația există, debifat altfel", () => {
  const selected = ["t1", "t3"];
  assert.equal(isOptionChecked(selected, "t1"), true);
  assert.equal(isOptionChecked(selected, "t3"), true);
  assert.equal(isOptionChecked(selected, "t2"), false);
});

test("toggleSelection: adaugă / elimină o selecție", () => {
  assert.deepEqual(toggleSelection(["t1", "t2"], "t3"), ["t1", "t2", "t3"]); // adaugă
  assert.deepEqual(toggleSelection(["t1", "t2"], "t1"), ["t2"]); // elimină
});

test("salvare fără modificări: setul încărcat = setul care rămâne bifat (fără ștergere accidentală)", () => {
  // Relațiile din DB → ids preselectate. La o salvare fără modificări, exact aceste
  // ids rămân bifate (isOptionChecked = true) → ar fi re-trimise, deci sync_junction
  // NU golește relațiile.
  const fromDb = selectedJunctionIds([{ tag_id: "t1" }, { tag_id: "t2" }], "tag_id");
  const stillChecked = ["t1", "t2", "t3"].filter((id) => isOptionChecked(fromDb, id));
  assert.deepEqual(stillChecked, ["t1", "t2"]); // exact cele din DB, niciuna pierdută
});
