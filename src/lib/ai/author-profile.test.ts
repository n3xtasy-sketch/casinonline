import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR_PROFILE, AUTHOR_VOICE_RULES, AUTHOR_CONTEXT_NOTE, EXPERT_INFO_ANGLES,
  authorPersonaLines, expertContributionDirective,
} from "@/lib/ai/author-profile";

test("author profile: identity + declared expertise", () => {
  assert.equal(AUTHOR_PROFILE.name, "Radu Bogdan Gabriel");
  assert.match(AUTHOR_PROFILE.role, /Specialist SEO/i);
  assert.equal(AUTHOR_PROFILE.yearsExperience, 7);
  for (const topic of ["cazinouri online", "bonusuri fara depunere", "rotiri gratuite", "wagering requirements", "KYC"]) {
    assert.ok(AUTHOR_PROFILE.expertise.includes(topic), `lipseste expertiza: ${topic}`);
  }
});

test("author voice rules cover the required style constraints", () => {
  const all = AUTHOR_VOICE_RULES.join("\n");
  assert.match(all, /FARA diacritice/i);
  assert.match(all, /superlative nejustificate/i);
  assert.match(all, /marketing AI/i);
  assert.match(all, /Nu repeta mecanic keyword/i);
  assert.match(all, /reformuleaza titlul/i);
  assert.match(all, /Nu inventa experiente personale/i);
});

test("profile is editorial CONTEXT, not proof of personal testing", () => {
  assert.match(AUTHOR_CONTEXT_NOTE, /NU dovada/i);
  assert.match(AUTHOR_CONTEXT_NOTE, /nu pretinde ca ai testat/i);
});

test("persona lines carry the author identity + the no-personal-testing note", () => {
  const lines = authorPersonaLines().join("\n");
  assert.match(lines, /Radu Bogdan Gabriel/);
  assert.match(lines, /peste 7 ani/);
  assert.match(lines, /NU dovada ca ofertele au fost testate/i);
});

test("expert contribution directive lists concrete angles and forbids inventing values", () => {
  const d = expertContributionDirective();
  assert.match(d, /\[CONTRIBUTIE\]/);
  assert.ok(EXPERT_INFO_ANGLES.length >= 5);
  assert.match(d, /rulaj.*castigurilor/i); // wagering bonus vs winnings
  assert.match(d, /plafonul maxim de retragere/i);
  assert.match(d, /Nu inventa valori/i); // no invented operator values
});
