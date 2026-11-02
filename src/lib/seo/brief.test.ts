import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildBriefDraft,
  mergeBriefDraft,
  type BriefClusterInput,
  type BriefKeyword,
  type EntityDictItem,
  type BriefValues,
  type Provenance,
} from "@/lib/seo/brief";

let seq = 0;
function bk(keyword: string, over: Partial<BriefKeyword> = {}): BriefKeyword {
  seq += 1;
  return {
    id: over.id ?? `k${seq}`,
    keyword,
    normalized: over.normalized ?? keyword.toLowerCase(),
    intent: over.intent ?? null,
    volume: over.volume ?? null,
    parentTopic: over.parentTopic ?? null,
  };
}

function input(over: Partial<BriefClusterInput> = {}): BriefClusterInput {
  return {
    clusterId: "c1",
    clusterName: "Cluster test",
    clusterPrimaryKeyword: null,
    clusterIntent: null,
    keywords: [],
    mapping: { url: null, status: "none" },
    recommendedUrl: null,
    importIds: [],
    ...over,
  };
}

test("primary keyword is confirmed when the cluster sets one", () => {
  const d = buildBriefDraft(input({ clusterPrimaryKeyword: "bonus fara depunere", keywords: [bk("x bonus")] }));
  assert.equal(d.primaryKeyword, "bonus fara depunere");
  assert.equal(d.fieldProvenance.primary_keyword, "confirmed");
});

test("primary keyword is suggested (not confirmed) when derived from keywords", () => {
  const d = buildBriefDraft(input({ keywords: [bk("rotiri gratuite", { volume: 500 }), bk("rotiri gratuite fara depunere", { volume: 100 })] }));
  assert.equal(d.fieldProvenance.primary_keyword, "suggested");
  assert.ok(d.primaryKeyword.length > 0);
});

test("secondary keywords exclude the primary", () => {
  const d = buildBriefDraft(input({ clusterPrimaryKeyword: "rotiri gratuite", keywords: [bk("rotiri gratuite", { volume: 9 }), bk("rotiri gratuite 2026", { volume: 8 })] }));
  assert.ok(!d.secondaryKeywords.map((s) => s.toLowerCase()).includes("rotiri gratuite"));
  assert.ok(d.secondaryKeywords.includes("rotiri gratuite 2026"));
});

test("intent is always suggested — never presented as validated", () => {
  const withCluster = buildBriefDraft(input({ clusterIntent: "commercial", keywords: [bk("a")] }));
  assert.equal(withCluster.intent, "commercial");
  assert.equal(withCluster.fieldProvenance.intent, "suggested");
  const derived = buildBriefDraft(input({ keywords: [bk("ce este rtp", { intent: "Informational" })] }));
  assert.equal(derived.fieldProvenance.intent, "suggested");
});

test("target_url is confirmed only from a confirmed mapping", () => {
  const confirmed = buildBriefDraft(input({ keywords: [bk("a")], mapping: { url: "/x", status: "confirmed" } }));
  assert.equal(confirmed.targetUrl, "/x");
  assert.equal(confirmed.fieldProvenance.target_url, "confirmed");
  const suggested = buildBriefDraft(input({ keywords: [bk("a")], recommendedUrl: "/y", mapping: { url: null, status: "none" } }));
  assert.equal(suggested.targetUrl, "/y");
  assert.equal(suggested.fieldProvenance.target_url, "suggested");
});

test("outline uses ONLY parent-topic groups with >=2 keywords; else empty + review flag", () => {
  const grouped = buildBriefDraft(input({
    keywords: [
      bk("bonus bun venit", { parentTopic: "Bonusuri" }),
      bk("bonus bun venit mare", { parentTopic: "Bonusuri" }),
      bk("rotiri gratuite", { parentTopic: "Rotiri" }), // lone parent → no H2
    ],
  }));
  const h2s = grouped.outline.filter((o) => o.level === 2);
  assert.equal(h2s.length, 1);
  assert.equal(h2s[0].heading, "Bonusuri");

  const thin = buildBriefDraft(input({ keywords: [bk("a"), bk("b")] })); // no parent topics
  assert.equal(thin.outline.length, 0);
  assert.ok(thin.reviewFlags.includes("outline"));
});

test("entities: confirmed from a real CMS match, suggested from lexical terms", () => {
  const dict: EntityDictItem[] = [{ name: "NetBet", normalized: "netbet", type: "casino", ref: "/cazinouri-online/netbet" }];
  const d = buildBriefDraft(
    input({ keywords: [bk("netbet bonus mare", { normalized: "netbet bonus mare" }), bk("netbet bonus rapid", { normalized: "netbet bonus rapid" })] }),
    dict,
  );
  const confirmed = d.entities.find((e) => e.source === "confirmed");
  assert.ok(confirmed, "expected a confirmed CMS entity");
  assert.equal(confirmed!.ref, "/cazinouri-online/netbet");
  assert.ok(d.entities.some((e) => e.source === "suggested"), "expected at least one suggested lexical term");
});

test("faq is built only from question-form keywords", () => {
  const d = buildBriefDraft(input({ keywords: [bk("ce este rtp", { normalized: "ce este rtp" }), bk("bonus mare", { normalized: "bonus mare" })] }));
  assert.equal(d.faq.length, 1);
  assert.ok(d.faq[0].question.toLowerCase().startsWith("ce este rtp"));
  assert.equal(d.faq[0].answer, "");
});

test("generation is deterministic", () => {
  const i = input({ keywords: [bk("a b", { volume: 3, parentTopic: "P" }), bk("a c", { volume: 2, parentTopic: "P" })] });
  assert.deepEqual(buildBriefDraft(i), buildBriefDraft(i));
});

test("mergeBriefDraft keeps locked, manual and confirmed; refreshes suggested", () => {
  const existing: BriefValues & { fieldProvenance: Record<string, Provenance> } = {
    title: "Vechi", primaryKeyword: "manual primary", secondaryKeywords: ["x"], intent: "commercial",
    targetUrl: "/confirmed", h1: "H1 vechi", outline: [], entities: [], faq: [],
    fieldProvenance: { primary_keyword: "manual", target_url: "confirmed", h1: "suggested" },
  };
  const fresh = buildBriefDraft(input({ clusterPrimaryKeyword: "fresh primary", recommendedUrl: "/fresh", keywords: [bk("fresh kw")] }));
  const merged = mergeBriefDraft(existing, fresh, ["h1"]);
  assert.equal(merged.values.primaryKeyword, "manual primary"); // manual preserved
  assert.equal(merged.values.targetUrl, "/confirmed"); // confirmed preserved
  assert.equal(merged.values.h1, "H1 vechi"); // locked preserved
  assert.equal(merged.values.title, fresh.title); // suggested refreshed
  assert.equal(merged.fieldProvenance.primary_keyword, "manual");
  assert.equal(merged.fieldProvenance.target_url, "confirmed");
});
