-- 0037_seo_briefs_workbench.sql  (FAZA KE-0 — SEO Brief Workbench)
--
-- Activates the EXISTING seo_briefs table (created empty in 0033, only ever counted) into a
-- full editorial workflow that links keyword clusters + URL mapping to the CMS. Additive +
-- idempotent; safe on populated data. Apply DEV first, then (later, with approval) PROD BEFORE
-- deploying the code that reads/writes these columns.
--
-- DESIGN (integrates the KE-0 review adjustments):
--   * NO new table, NO parallel CMS. seo_briefs is reused as-is; we only ADD columns + one
--     partial unique index. RLS/grants are INHERITED from 0033 (admin-only: FOR ALL to
--     authenticated USING is_admin()); nothing here touches RLS, grants or triggers.
--   * Provenance is SEPARATE from SEO validation. `field_provenance` records, per field,
--     whether a value is 'confirmed' (an explicit editorial decision / a verified CMS source),
--     'suggested' (deterministic algorithm) or 'manual' (typed by the editor). It does NOT
--     assert SERP validation — we have no SERP data yet.
--   * Deterministic generation only. No LLM / AI / external calls are introduced by this phase.
--   * Manual-edit protection: `locked_fields` lists fields the editor controls; regeneration
--     never overwrites a locked (or confirmed) field.
--
-- Depends on: seo_briefs, seo_projects, seo_clusters (0033). Verified present; 0 brief rows in
-- DEV and PROD at design time (so the partial unique index below cannot fail on existing data).

-- ── 1. editorial + provenance columns (all additive, with safe defaults) ──────
alter table public.seo_briefs add column if not exists h1 text;
-- Proposed H2/H3 structure: [{ level: 2|3, heading, keywords: [], note }]. Conservative — may be
-- empty when the data does not support a confident outline (flagged for editorial review in app).
alter table public.seo_briefs add column if not exists outline jsonb not null default '[]'::jsonb;
-- Topical entities: [{ name, type, source }]. source='confirmed' ONLY when matched to a real CMS
-- row (casinos/providers/games/payment_methods); lexically-extracted terms are source='suggested'.
alter table public.seo_briefs add column if not exists entities jsonb not null default '[]'::jsonb;
-- FAQ: [{ question, answer }] — answers left empty for the editor to write.
alter table public.seo_briefs add column if not exists faq jsonb not null default '[]'::jsonb;
-- Data provenance of the generation: { clusterId, importIds: [], generatedFrom }.
alter table public.seo_briefs add column if not exists sources jsonb not null default '{}'::jsonb;
-- Per-field origin: { "<field>": "confirmed" | "suggested" | "manual" }.
alter table public.seo_briefs add column if not exists field_provenance jsonb not null default '{}'::jsonb;
-- Fields the editor has taken manual control of → protected from regeneration overwrite.
alter table public.seo_briefs add column if not exists locked_fields jsonb not null default '[]'::jsonb;
-- Last deterministic (re)generation; NULL for an empty brief created manually.
alter table public.seo_briefs add column if not exists generated_at timestamptz;

-- ── 2. duplicate protection ───────────────────────────────────────────────────
-- At most ONE active (non-archived) brief per (project, cluster). Archived briefs do not block
-- re-creating one for the same cluster. Briefs with no cluster (manual, cluster_id null) are not
-- constrained. Partial unique index (no new column needed).
create unique index if not exists uq_seo_briefs_cluster_active
  on public.seo_briefs (project_id, cluster_id)
  where cluster_id is not null and status <> 'archived';

-- ── ROLLBACK (do NOT run as part of apply) ───────────────────────────────────
-- A) IMMEDIATE (before any brief content exists) — LOSSLESS:
--      drop index if exists public.uq_seo_briefs_cluster_active;
--      alter table public.seo_briefs
--        drop column if exists h1,
--        drop column if exists outline,
--        drop column if exists entities,
--        drop column if exists faq,
--        drop column if exists sources,
--        drop column if exists field_provenance,
--        drop column if exists locked_fields,
--        drop column if exists generated_at;
-- B) LATER (after editorial briefs exist) — DESTRUCTIVE (drops h1/outline/entities/faq for all
--    briefs; not re-derivable). Prefer: set briefs to 'archived' / revert reading code and keep
--    the columns; export seo_briefs first if a true teardown is required.
