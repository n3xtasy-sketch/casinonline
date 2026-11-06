import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * AI-2 Content Studio source-regression guards (no component-render harness). Pin: admin gate on the
 * data actions, no CMS writes / no auto-save, the UI reuses the AI-1 server action (no arbitrary
 * client prompt), and the page is server-rendered from real projects.
 */
const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

test("studio data actions are admin-gated and read-only (no CMS writes)", () => {
  const a = read("src/app/admin/(panel)/content-studio/actions.ts");
  assert.match(a, /requireAdmin/);
  assert.match(a, /is_admin/);
  assert.match(a, /loadProjectBriefsAction/);
  assert.match(a, /loadStudioBriefAction/);
  assert.doesNotMatch(a, /\.(insert|update|delete|upsert)\(/); // read-only
});

test("Content Studio UI reuses the AI-1 server action and never auto-saves / sends a raw prompt", () => {
  const c = read("src/components/admin/ContentStudio.tsx");
  assert.match(c, /generateBriefSectionAction/); // reuse AI-1 action
  assert.match(c, /generateBriefSectionAction\(projectId, briefId, sectionId\)/); // only ids, no client prompt
  assert.doesNotMatch(c, /ANTHROPIC|apiKey|sk-ant/); // no key in the client
  assert.doesNotMatch(c, /\.(insert|update|delete|upsert)\(/); // nothing persisted
  assert.match(c, /window\.confirm/); // unsaved-changes guard on regenerate
  assert.match(c, /Se generează/); // loading indicator
});

test("Content Studio page is server-rendered from real projects", () => {
  const p = read("src/app/admin/(panel)/content-studio/page.tsx");
  assert.match(p, /listSeoProjects/);
  assert.match(p, /ContentStudio/);
});

test("AI-1 action remains admin-gated (reused by the Studio)", () => {
  const ai = read("src/app/admin/(panel)/seo-research/[id]/briefs/ai-actions.ts");
  assert.match(ai, /requireAdmin/);
});
