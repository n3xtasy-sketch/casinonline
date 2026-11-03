import { test } from "node:test";
import assert from "node:assert/strict";

import { isBriefDirty, type BriefEditorSnapshot } from "@/lib/brief-editor-state";

function snap(over: Partial<BriefEditorSnapshot> = {}): BriefEditorSnapshot {
  return {
    title: "Bonus Fara Depunere", primaryKeyword: "bonus fara depunere cazino", secondary: "a\nb",
    intent: "commercial", targetUrl: "/bonusuri-casino/maxbet-fara-depunere", h1: "H1",
    outline: "## S1", entities: "NetBet | casino", faq: "Q | A", notes: "", locked: ["title"],
    ...over,
  };
}

test("identical snapshots are not dirty", () => {
  assert.equal(isBriefDirty(snap(), snap()), false);
});

test("editing target_url makes it dirty (the reported bug)", () => {
  const baseline = snap();
  const current = snap({ targetUrl: "/bonusuri/bonus-fara-depunere" });
  assert.equal(isBriefDirty(baseline, current), true);
});

test("toggling a lock makes it dirty (provenance/locked_fields tracked)", () => {
  assert.equal(isBriefDirty(snap({ locked: ["title"] }), snap({ locked: ["title", "target_url"] })), true);
});

test("locked set is order-insensitive", () => {
  assert.equal(isBriefDirty(snap({ locked: ["title", "intent"] }), snap({ locked: ["intent", "title"] })), false);
});

test("each editable field is tracked", () => {
  const fields: (keyof BriefEditorSnapshot)[] = ["title", "primaryKeyword", "secondary", "intent", "targetUrl", "h1", "outline", "entities", "faq", "notes"];
  for (const f of fields) {
    assert.equal(isBriefDirty(snap(), snap({ [f]: "CHANGED" } as Partial<BriefEditorSnapshot>)), true, `field ${f} should be tracked`);
  }
});
