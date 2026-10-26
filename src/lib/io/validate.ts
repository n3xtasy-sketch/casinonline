/** Pure CSV-row validation + mapping for import (no server deps — unit-testable). */

import { LIST_SEP, type EntityDesc, type JsonFieldDef, type LookupKey } from "@/lib/io/entities";
import { slugify, isSafeInternalPath } from "@/lib/guide-format";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sentinel: intentionally clear a value on update (only where allowed; never on required fields). */
export const CLEAR_SENTINEL = "__CLEAR__";

const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * Validate a parsed JSON value against the shape expected for a jsonb column.
 * Returns the normalized value, or an error message (null = ok). Strict: wrong
 * shape / unsafe internal links / bad levels are rejected with a clear message.
 */
function validateJsonField(
  kind: JsonFieldDef["kind"],
  parsed: unknown,
): { value: unknown; error: string | null } {
  if (!Array.isArray(parsed)) return { value: null, error: "trebuie să fie o listă JSON ([...])" };
  const items = parsed as Record<string, unknown>[];

  if (kind === "faq") {
    const out: { question: string; answer: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (!o || typeof o !== "object" || !isText(o.question) || !isText(o.answer))
        return { value: null, error: `elementul ${i + 1} are nevoie de "question" și "answer" (text)` };
      out.push({ question: o.question.trim(), answer: o.answer.trim() });
    }
    return { value: out, error: null };
  }

  if (kind === "related_links") {
    const out: { label: string; href: string }[] = [];
    const bad: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (!o || typeof o !== "object" || !isText(o.label) || !isText(o.href))
        return { value: null, error: `elementul ${i + 1} are nevoie de "label" și "href" (text)` };
      if (!isSafeInternalPath(o.href)) { bad.push(o.href); continue; }
      out.push({ label: o.label.trim(), href: o.href.trim() });
    }
    if (bad.length) return { value: null, error: `href-uri non-interne (doar căi "/..."): ${bad.join(", ")}` };
    return { value: out, error: null };
  }

  // sections
  const out: { id: string; heading: string; level: 2 | 3; body: string[] }[] = [];
  const usedIds = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const o = items[i];
    if (!o || typeof o !== "object" || !isText(o.heading))
      return { value: null, error: `secțiunea ${i + 1}: lipsește "heading" (text)` };
    if (o.level !== 2 && o.level !== 3)
      return { value: null, error: `secțiunea ${i + 1}: "level" trebuie 2 sau 3` };
    if (!Array.isArray(o.body) || !o.body.every((b) => typeof b === "string"))
      return { value: null, error: `secțiunea ${i + 1}: "body" trebuie listă de paragrafe (text)` };
    const base = slugify(o.heading) || "sectiune";
    let id = isText(o.id) ? o.id.trim() : base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    out.push({
      id,
      heading: o.heading.trim(),
      level: o.level,
      body: (o.body as string[]).map((b) => b.trim()).filter(Boolean),
    });
  }
  return { value: out, error: null };
}

export type RowLevel = "valid" | "warning" | "error";

/** CREATE = legacy create-only; UPSERT = identify existing by id→slug and update in place. */
export type ImportMode = "create" | "upsert";

export type RowOperation = "create" | "update" | "skip";

export interface RowResult {
  line: number;
  slug: string;
  level: RowLevel;
  messages: string[];
  operation?: RowOperation;
}

export interface Relation {
  col: string; // m2m CSV column (for diff/change tracing)
  junction: string;
  selfCol: string;
  otherCol: string;
  ids: string[];
  /** true (update): delete this record's existing junction rows before inserting the new set. */
  replace: boolean;
}

export interface BuiltRow extends RowResult {
  operation: RowOperation;
  /** id of the existing record to update (null on create / skip). */
  targetId: string | null;
  /** create → full insert row; update → patch of only the provided columns. */
  dbRow: Record<string, unknown>;
  relations: Relation[];
}

/** Minimal projection of an existing DB record, used to identify upsert targets. */
export interface ExistingRecord {
  id: string;
  slug: string;
  status?: string | null;
}

export type SlugMaps = Map<LookupKey, Map<string, string>>;

function num(v: string, int: boolean): number | null | "err" {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return "err";
  return int ? Math.trunc(n) : n;
}

export function lookupKeysFor(desc: EntityDesc): LookupKey[] {
  const keys = new Set<LookupKey>();
  desc.fks.forEach((f) => keys.add(f.lookup));
  desc.m2m.forEach((m) => keys.add(m.lookup));
  return [...keys];
}

export function buildRows(
  desc: EntityDesc,
  rows: Record<string, string>[],
  slugToId: SlugMaps,
  existing: ExistingRecord[],
  mode: ImportMode = "create",
): BuiltRow[] {
  const byId = new Map<string, ExistingRecord>();
  const bySlug = new Map<string, ExistingRecord>();
  for (const e of existing) {
    byId.set(e.id, e);
    bySlug.set(e.slug, e);
  }
  const seenSlugs = new Set<string>();
  const seenTargets = new Set<string>();

  return rows.map((row, i) => {
    const line = i + 2; // header is line 1
    const messages: string[] = [];
    let level: RowLevel = "valid";
    const err = (m: string) => {
      messages.push(m);
      level = "error";
    };
    const warn = (m: string) => {
      messages.push(m);
      if (level !== "error") level = "warning";
    };

    const idRaw = (row.id ?? "").trim();
    const slug = (row.slug ?? "").trim().toLowerCase();

    // ── Identify target ───────────────────────────────────────────────
    // CREATE: legacy create-only (id ignored; existing slug is an error).
    // UPSERT: match by stable id first, then slug; refuse ambiguous rows.
    let operation: "create" | "update" = "create";
    let target: ExistingRecord | null = null;

    if (mode === "create") {
      if (!slug) err("slug lipsă");
      else if (!SLUG_RE.test(slug)) err("slug invalid (doar litere mici, cifre, cratime)");
      else if (seenSlugs.has(slug)) err("slug duplicat în fișier");
      else if (bySlug.has(slug)) err("slug există deja (create-only)");
      if (slug) seenSlugs.add(slug);
    } else {
      let matchById: ExistingRecord | undefined;
      let matchBySlug: ExistingRecord | undefined;
      let hardStop = false;

      if (idRaw) {
        if (!UUID_RE.test(idRaw)) {
          err("id invalid (nu e UUID)");
          hardStop = true;
        } else {
          matchById = byId.get(idRaw);
          if (!matchById) {
            err(`id „${idRaw}" inexistent (nu creez/modific un id necunoscut)`);
            hardStop = true;
          }
        }
      }

      if (!slug) {
        if (!idRaw) err("slug lipsă");
      } else if (!SLUG_RE.test(slug)) {
        err("slug invalid (doar litere mici, cifre, cratime)");
      } else if (seenSlugs.has(slug)) {
        err("slug duplicat în fișier");
      } else {
        matchBySlug = bySlug.get(slug);
      }
      if (slug) seenSlugs.add(slug);

      if (!hardStop) {
        if (matchById && matchBySlug && matchById.id !== matchBySlug.id) {
          err("id și slug indică înregistrări diferite (ambiguu) — rând oprit");
          hardStop = true;
        } else {
          target = matchById ?? matchBySlug ?? null;
          operation = target ? "update" : "create";
          if (target) {
            if (seenTargets.has(target.id)) {
              err("aceeași înregistrare apare de două ori în fișier");
              hardStop = true;
            } else {
              seenTargets.add(target.id);
            }
          }
        }
      }

      if (hardStop) {
        return { line, slug: slug || target?.slug || "", level, messages, operation: "skip", targetId: null, dbRow: {}, relations: [] };
      }
    }

    const dbRow: Record<string, unknown> = {};
    const create = operation === "create";
    const sentinel = mode === "upsert"; // __CLEAR__ is only special in upsert mode
    if (create) {
      dbRow.status = "draft"; // new records always enter as draft
      dbRow.slug = slug;
    } else if (idRaw && slug && target && slug !== target.slug) {
      // rename is allowed only via a stable id match, and only onto a free slug
      const other = bySlug.get(slug);
      if (other && other.id !== target.id) err(`slug nou „${slug}" aparține altei înregistrări`);
      else {
        dbRow.slug = slug;
        warn(`redenumire slug: ${target.slug} → ${slug}`);
      }
    }

    for (const f of desc.fields) {
      const raw = (row[f.col] ?? "").trim();
      const dbc = f.db ?? f.col;
      if (sentinel && raw === CLEAR_SENTINEL) {
        if (f.required) err(`${f.col}: nu poate fi golit (obligatoriu)`);
        else if (create) err(`${f.col}: __CLEAR__ valid doar la actualizare`);
        else dbRow[dbc] = f.type === "list" ? [] : null;
        continue;
      }
      if (!raw) {
        // create → set default; update → keep existing (omit from patch)
        if (create) {
          if (f.required) err(`${f.col} lipsă (obligatoriu)`);
          else dbRow[dbc] = f.type === "list" ? [] : null;
        }
        continue;
      }
      if (f.type === "int" || f.type === "float") {
        const n = num(raw, f.type === "int");
        if (n === "err") err(`${f.col} nu e număr valid`);
        else dbRow[dbc] = n;
      } else if (f.type === "url") {
        if (!/^https?:\/\/\S+$/.test(raw)) err(`${f.col} nu e URL valid (http(s)://)`);
        else dbRow[dbc] = raw;
      } else if (f.type === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) err(`${f.col} nu e dată validă (YYYY-MM-DD)`);
        else dbRow[dbc] = raw;
      } else if (f.type === "list") {
        dbRow[dbc] = raw.split(LIST_SEP).map((x) => x.trim()).filter(Boolean);
      } else {
        dbRow[dbc] = raw;
      }
    }

    for (const fk of desc.fks) {
      const rawOrig = (row[fk.col] ?? "").trim();
      const raw = rawOrig.toLowerCase();
      if (sentinel && rawOrig === CLEAR_SENTINEL) {
        if (fk.required) err(`${fk.col}: nu poate fi golit (obligatoriu)`);
        else if (create) err(`${fk.col}: __CLEAR__ valid doar la actualizare`);
        else dbRow[fk.db] = null;
        continue;
      }
      if (!raw) {
        if (create) {
          if (fk.required) err(`${fk.col} lipsă (obligatoriu)`);
          else dbRow[fk.db] = null;
        }
        continue;
      }
      const id = slugToId.get(fk.lookup)?.get(raw);
      if (!id) err(`${fk.col}: slug „${raw}" inexistent`);
      else dbRow[fk.db] = id;
    }

    const relations: Relation[] = [];
    for (const m of desc.m2m) {
      const raw = (row[m.col] ?? "").trim();
      if (sentinel && raw === CLEAR_SENTINEL) {
        if (create) err(`${m.col}: __CLEAR__ valid doar la actualizare`);
        else relations.push({ col: m.col, junction: m.junction, selfCol: m.selfCol, otherCol: m.otherCol, ids: [], replace: true });
        continue;
      }
      if (!raw) continue; // create → no relations; update → leave untouched
      const slugs = raw.split(LIST_SEP).map((x) => x.trim().toLowerCase()).filter(Boolean);
      const ids: string[] = [];
      for (const sg of slugs) {
        const id = slugToId.get(m.lookup)?.get(sg);
        if (!id) warn(`${m.col}: „${sg}" inexistent (relație omisă)`);
        else ids.push(id);
      }
      relations.push({ col: m.col, junction: m.junction, selfCol: m.selfCol, otherCol: m.otherCol, ids, replace: !create });
    }

    // jsonb columns supplied as JSON strings in the CSV (e.g. guide sections/faq).
    for (const jf of desc.jsonFields ?? []) {
      const raw = (row[jf.col] ?? "").trim();
      if (sentinel && raw === CLEAR_SENTINEL) {
        if (create) err(`${jf.col}: __CLEAR__ valid doar la actualizare`);
        else dbRow[jf.col] = [];
        continue;
      }
      if (!raw) {
        if (create) dbRow[jf.col] = [];
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        err(`${jf.col}: JSON invalid`);
        continue;
      }
      const res = validateJsonField(jf.kind, parsed);
      if (res.error) err(`${jf.col}: ${res.error}`);
      else dbRow[jf.col] = res.value;
    }

    // Derived link columns: on create always; on update only when the source changed.
    if (create) {
      if (desc.key === "casinos") dbRow.offer_url = `/go/${slug}`;
      if (desc.key === "bonuses") {
        const cslug = (row.casino_slug ?? "").trim().toLowerCase();
        dbRow.claim_url = cslug ? `/go/${cslug}` : null;
      }
    } else {
      if (desc.key === "casinos" && typeof dbRow.slug === "string") dbRow.offer_url = `/go/${dbRow.slug}`;
      if (desc.key === "bonuses") {
        const craw = (row.casino_slug ?? "").trim();
        if (craw && craw !== CLEAR_SENTINEL) dbRow.claim_url = `/go/${craw.toLowerCase()}`;
      }
    }

    // Status changes are not applied via import (Phase 1): surface, don't mutate.
    if (!create) {
      const statusRaw = (row.status ?? "").trim();
      if (statusRaw && target?.status && statusRaw !== target.status) {
        warn(`status „${statusRaw}" ignorat (schimbarea statusului se face din Admin, nu la import)`);
      }
    }

    return {
      line,
      slug: slug || target?.slug || "",
      level,
      messages,
      operation,
      targetId: target?.id ?? null,
      dbRow,
      relations,
    };
  });
}
