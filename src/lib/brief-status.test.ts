import { test } from "node:test";
import assert from "node:assert/strict";

import { availableBriefTransitions, isBriefTransitionAllowed, briefReadinessError, type BriefStatus } from "@/lib/brief-status";

test("allowed transitions follow the matrix", () => {
  const allowed: [BriefStatus, BriefStatus][] = [
    ["draft", "ready"], ["draft", "archived"],
    ["ready", "approved"], ["ready", "draft"], ["ready", "archived"],
    ["approved", "ready"], ["approved", "archived"],
    ["archived", "draft"],
  ];
  for (const [from, to] of allowed) assert.ok(isBriefTransitionAllowed(from, to), `${from} → ${to} should be allowed`);
});

test("forbidden transitions are rejected", () => {
  const forbidden: [BriefStatus, BriefStatus][] = [
    ["draft", "approved"], // must pass through ready
    ["approved", "draft"], // must reopen to ready first
    ["archived", "ready"], ["archived", "approved"],
    ["draft", "draft"], ["ready", "ready"],
  ];
  for (const [from, to] of forbidden) assert.ok(!isBriefTransitionAllowed(from, to), `${from} → ${to} should be forbidden`);
});

test("available transitions never include a self-loop", () => {
  for (const s of ["draft", "ready", "approved", "archived"] as BriefStatus[])
    assert.ok(!availableBriefTransitions(s).some((t) => t.next === s));
});

test("readiness gate requires primary, target URL, H1 and at least one H2", () => {
  assert.equal(briefReadinessError({ primaryKeyword: "", targetUrl: "/x", h1: "H", outline: [{ level: 2 }] }), "Lipsește keyword-ul principal.");
  assert.equal(briefReadinessError({ primaryKeyword: "p", targetUrl: "", h1: "H", outline: [{ level: 2 }] }), "Lipsește URL-ul țintă.");
  assert.equal(briefReadinessError({ primaryKeyword: "p", targetUrl: "/x", h1: "", outline: [{ level: 2 }] }), "Lipsește H1-ul propus.");
  assert.equal(briefReadinessError({ primaryKeyword: "p", targetUrl: "/x", h1: "H", outline: [{ level: 3 }] }), "Outline-ul nu are niciun H2.");
  assert.equal(briefReadinessError({ primaryKeyword: "p", targetUrl: "/x", h1: "H", outline: [{ level: 2 }] }), null);
});
