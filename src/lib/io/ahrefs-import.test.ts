import { test } from "node:test";
import assert from "node:assert/strict";

import {
  detectDelimiter,
  parseAhrefsCsv,
  detectMapping,
  parseMetric,
  buildAhrefsRows,
  ahrefsContentHash,
  type BuildOpts,
  type ColumnMapping,
} from "@/lib/io/ahrefs-import";

test("detectDelimiter: comma / semicolon / tab", () => {
  assert.equal(detectDelimiter("Keyword,Volume,KD"), ",");
  assert.equal(detectDelimiter("Keyword;Volume;KD"), ";");
  assert.equal(detectDelimiter("Keyword\tVolume\tKD"), "\t");
  assert.equal(detectDelimiter("Keyword"), ",");
});

test("parseAhrefsCsv: BOM + quoted field with delimiter inside", () => {
  const csv = '﻿Keyword,Volume\n"bonus, mare",1200\nrotiri,900';
  const p = parseAhrefsCsv(csv);
  assert.deepEqual(p.headers, ["Keyword", "Volume"]);
  assert.equal(p.rows[0].Keyword, "bonus, mare");
  assert.equal(p.rows[0].Volume, "1200");
});

test("parseAhrefsCsv: semicolon-delimited", () => {
  const p = parseAhrefsCsv("Keyword;Volume\npacanele;500");
  assert.equal(p.delimiter, ";");
  assert.equal(p.rows[0].Keyword, "pacanele");
});

test("parseAhrefsCsv: UTF-16 BOM rejected with a clear error", () => {
  const utf16 = String.fromCharCode(0xfeff, 0x4b, 0x00, 0x65, 0x00);
  const p = parseAhrefsCsv(utf16);
  assert.ok(p.error && /UTF-16/.test(p.error));
});

test("detectMapping: synonyms + ignores unknown columns", () => {
  const { mapping, ignored } = detectMapping(["Keyword", "Search Volume", "KD", "Traffic potential", "Intent", "CPC", "Parent Keyword", "Country", "SERP features"]);
  assert.equal(mapping.keyword, "Keyword");
  assert.equal(mapping.volume, "Search Volume");
  assert.equal(mapping.difficulty, "KD");
  assert.equal(mapping.traffic_potential, "Traffic potential");
  assert.equal(mapping.parent_topic, "Parent Keyword");
  assert.deepEqual(ignored, ["SERP features"]);
});

test("parseMetric: missing/empty → undefined, 0 → 0, thousands/currency tolerated", () => {
  assert.equal(parseMetric(undefined, true), undefined); // column absent
  assert.equal(parseMetric("", true), undefined); // empty cell
  assert.equal(parseMetric("0", true), 0); // real zero
  assert.equal(parseMetric("1,200", true), 1200);
  assert.equal(parseMetric("$1.50", false), 1.5);
  assert.equal(parseMetric("abc", true), "err");
});

const mapping: ColumnMapping = {
  keyword: "Keyword", volume: "Volume", difficulty: "KD", traffic_potential: "TP",
  intent: "Intent", cpc: "CPC", parent_topic: "Parent", country: null,
};
const opts: BuildOpts = { mapping, wizardCountry: "ro", countryMode: "wizard" };

test("buildAhrefsRows: provided-only metrics + normalization + dedup in file", () => {
  const rows: Record<string, string>[] = [
    { Keyword: "Bonus Fără Depunere", Volume: "1000", KD: "5", TP: "", Intent: "informational", CPC: "0.3", Parent: "bonusuri" },
    { Keyword: "bonus fara depunere", Volume: "900" }, // dedup of row 1 (normalized equal)
    { Keyword: "", Volume: "100" }, // invalid: no keyword
  ];
  const built = buildAhrefsRows(rows, opts);
  assert.equal(built[0].normalized, "bonus fara depunere");
  assert.equal(built[0].country, "ro");
  assert.equal(built[0].metrics.volume, 1000);
  assert.equal(built[0].metrics.difficulty, 5);
  assert.equal("traffic_potential" in built[0].metrics, false); // empty cell → NOT provided
  assert.equal(built[0].metrics.intent, "informational");
  assert.equal(built[1].dupInFile, true);
  assert.equal(built[2].level, "error");
});

test("buildAhrefsRows: zero volume is kept (not treated as missing)", () => {
  const built = buildAhrefsRows([{ Keyword: "x", Volume: "0" }], opts);
  assert.equal(built[0].metrics.volume, 0);
});

test("buildAhrefsRows: country from CSV only when countryMode='csv'", () => {
  const m2: ColumnMapping = { ...mapping, country: "Country" };
  const row = [{ Keyword: "k", Country: "US" }];
  assert.equal(buildAhrefsRows(row, { mapping: m2, wizardCountry: "ro", countryMode: "wizard" })[0].country, "ro");
  assert.equal(buildAhrefsRows(row, { mapping: m2, wizardCountry: "ro", countryMode: "csv" })[0].country, "us");
});

test("ahrefsContentHash: changes with mapping or country rule", () => {
  const h1 = ahrefsContentHash("csv", opts);
  assert.equal(h1, ahrefsContentHash("csv", opts));
  assert.notEqual(h1, ahrefsContentHash("csv", { ...opts, countryMode: "csv" }));
  assert.notEqual(h1, ahrefsContentHash("csv", { ...opts, mapping: { ...mapping, volume: null } }));
});
