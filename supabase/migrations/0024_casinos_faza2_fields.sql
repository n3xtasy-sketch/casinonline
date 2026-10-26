-- 0024_casinos_faza2_fields.sql
-- Faza 2 / Etapa Casinos: 4 additive, nullable columns on public.casinos.
-- Purely additive — no data backfill, no changes to existing columns, RLS inherited
-- from the table (no policy changes). SEO (og_image etc.) stays in seo_metadata; no
-- SEO column is added here.
--
--   year_launched        – anul lansării operatorului (integer)
--   license_verified_at  – data verificării licenței (date)
--   license_source       – URL către sursa licenței (text; validat ca URL la import/Admin)
--   verification_source  – URL către sursa verificării (text; validat ca URL la import/Admin)

alter table public.casinos
  add column if not exists year_launched integer,
  add column if not exists license_verified_at date,
  add column if not exists license_source text,
  add column if not exists verification_source text;
