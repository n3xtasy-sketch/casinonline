-- 0035_seo_categories.sql  (FAZA SEO-B — category architecture)
--
-- Scalable SEO category pages for the bonus / game / casino pillars, WITHOUT a /categorie/
-- URL segment and WITHOUT duplicating offers/games/casinos. Additive + idempotent; safe on
-- populated data. Apply DEV first, then (later, with approval) PROD — BEFORE deploying the
-- code that reads these.
--
-- Two parts:
--   1) seo_categories — ONE unified table (namespace + slug) holding the EDITORIAL + SEO
--      content of a category page, plus a deterministic `selector` key that binds the
--      category to the entities it lists. The selection PREDICATE lives in app code
--      (src/lib/seo-categories.ts) so it stays deterministic + unit-testable; the DB stores
--      only the binding key + content. No new per-entity data is duplicated.
--   2) bonuses.is_no_deposit — a single structured flag that resolves the free-spins /
--      no-deposit OVERLAP in the data model: one offer can be BOTH "rotiri gratuite" AND
--      "fără depunere" without being duplicated. "No wagering" derives from the existing
--      wagering_multiplier, "free spins" from free_spins, welcome/cashback from bonus_type —
--      so this is the ONLY new classification column required.
--
-- Depends on: content_status enum (0018), public.set_updated_at() (0001-era), public.is_admin()
-- (0005), bonuses + bonus_types (0001). All present in DEV (verified DEV↔PROD parity).

-- ── 1. seo_categories ────────────────────────────────────────────────────────
create table if not exists public.seo_categories (
  id uuid primary key default gen_random_uuid(),
  namespace text not null check (namespace in ('bonus', 'game', 'casino')),
  slug text not null,
  name text not null,
  description text,
  meta_title text,
  meta_description text,
  h1 text,
  intro text,
  body text,
  faq jsonb not null default '[]'::jsonb,
  -- Deterministic binding key resolved in app code, e.g.
  --   'bonus:no_deposit', 'bonus:no_deposit+free_spins', 'bonus:no_wagering',
  --   'bonus:type=bonus-de-bun-venit', 'bonus:type=cashback',
  --   'game:category=megaways', 'game:category=jackpot', 'game:gratis',
  --   'casino:tag=nou', 'casino:tag=retrageri-rapide', 'casino:license_onjn'
  selector text not null,
  status public.content_status not null default 'draft',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_seo_categories_namespace_slug unique (namespace, slug)
);
create index if not exists idx_seo_categories_ns_status on public.seo_categories (namespace, status);

drop trigger if exists trg_seo_categories_updated_at on public.seo_categories;
create trigger trg_seo_categories_updated_at before update on public.seo_categories
  for each row execute function public.set_updated_at();

-- RLS: public (anon) reads ONLY published; admins manage everything (is_admin()). Mirrors the
-- publishing model of the other content tables (0018) + anon least-privilege (0030).
alter table public.seo_categories enable row level security;
drop policy if exists "seo_categories public published" on public.seo_categories;
create policy "seo_categories public published" on public.seo_categories
  for select to anon, authenticated using (status = 'published');
drop policy if exists "seo_categories admin all" on public.seo_categories;
create policy "seo_categories admin all" on public.seo_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.seo_categories from anon;
grant select on public.seo_categories to anon;
grant select, insert, update, delete on public.seo_categories to authenticated;

-- ── 2. bonuses.is_no_deposit (overlap resolver) ──────────────────────────────
alter table public.bonuses add column if not exists is_no_deposit boolean not null default false;

-- Conservative, TRUTHFUL backfill: only offers explicitly typed as no-deposit. Overlap cases
-- (free-spins offers that are ALSO no-deposit) are set editorially in the CMS afterwards — we
-- do not guess from free-text.
update public.bonuses b
  set is_no_deposit = true
  from public.bonus_types t
  where b.bonus_type_id = t.id and t.slug = 'fara-depunere' and b.is_no_deposit = false;

comment on column public.bonuses.is_no_deposit is
  'Structured no-deposit flag, orthogonal to free_spins and bonus_type, so one offer can belong to BOTH /bonusuri/bonus-fara-depunere and /bonusuri/rotiri-gratuite-fara-depunere without duplication.';
