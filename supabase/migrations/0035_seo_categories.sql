-- 0035_seo_categories.sql  (FAZA SEO-B — category architecture)  [v3, post second review]
--
-- Scalable SEO category pages for the bonus / game / casino pillars, WITHOUT a /categorie/
-- URL segment and WITHOUT duplicating offers/games/casinos. Additive + idempotent; safe on
-- populated data. Apply DEV first, then (later, with approval) PROD — BEFORE deploying the
-- code that reads these.
--
-- Three parts:
--   1) seo_categories — ONE unified table (namespace + slug) with the EDITORIAL + SEO content
--      of a category page + a deterministic `selector` key that binds the category to the
--      entities it lists. The selection PREDICATE lives in app code (src/lib/seo-categories.ts)
--      so it stays deterministic + unit-testable; the DB stores only the binding key + content.
--   2) bonuses.is_no_deposit + bonuses.is_no_wagering — TWO explicit, verifiable flags that
--      resolve classification OVERLAPS without duplicating offers. free_spins reuses free_spins;
--      welcome/cashback reuse bonus_type. The one-time backfill runs ONLY on first install
--      (see the DO block) so it never overwrites a later editorial decision on re-run.
--   3) DB-level slug-collision guards (triggers, both directions) for game/casino namespaces,
--      reserving category slugs of ANY status (incl. draft).
--
-- Depends on: content_status enum (0018), public.set_updated_at(), public.is_admin() (0005),
-- games/casinos/bonuses/bonus_types (0001). All present in DEV (verified DEV↔PROD parity).
-- Verified: no existing game/casino slug collides with the planned category slugs.
--
-- ROLLBACK — see the documented block at the END of this file. Rollback is lossless ONLY
-- immediately after apply (before any CMS use). After editorial data is entered it is
-- DESTRUCTIVE — use the non-destructive disable path instead.

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
  -- Deterministic binding key resolved in app code (predicate), e.g.
  --   'bonus:no_deposit'            -> is_no_deposit
  --   'bonus:no_deposit+free_spins' -> is_no_deposit AND free_spins > 0
  --   'bonus:no_wagering'           -> is_no_wagering
  --   'bonus:type=bonus-de-bun-venit' / 'bonus:type=cashback' -> bonus_type_id
  --   'game:category=megaways' / 'game:category=jackpot'      -> games.category_id
  --   'game:gratis'   -> demo_url present AND passes isAllowedDemoUrl (app allowlist, default-deny)
  --   'casino:tag=nou' / 'casino:tag=retrageri-rapide'        -> casino_tags
  --   'casino:license_onjn' -> license ~ ONJN AND license_verified_at is not null (else keep draft)
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

-- RLS: public (anon) reads ONLY published; admins manage everything (is_admin()). Non-admin
-- authenticated users have no write policy → RLS denies INSERT/UPDATE/DELETE.
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

-- ── 2. bonus classification flags (overlap resolvers) — backfill ONCE ─────────
-- The columns are added idempotently; the conservative backfill runs ONLY when a column did
-- NOT exist before this run (first install), so re-executing 0035 never reverts an editorial
-- decision (e.g. an editor clearing is_no_deposit on a fara-depunere-typed offer).
do $$
declare dep_existed boolean; wag_existed boolean;
begin
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'bonuses' and column_name = 'is_no_deposit') into dep_existed;
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'bonuses' and column_name = 'is_no_wagering') into wag_existed;

  alter table public.bonuses add column if not exists is_no_deposit boolean not null default false;
  alter table public.bonuses add column if not exists is_no_wagering boolean not null default false;

  if not dep_existed then
    update public.bonuses b set is_no_deposit = true
      from public.bonus_types t where b.bonus_type_id = t.id and t.slug = 'fara-depunere';
  end if;
  if not wag_existed then
    update public.bonuses b set is_no_wagering = true
      from public.bonus_types t where b.bonus_type_id = t.id and t.slug = 'fara-rulaj';
  end if;
end $$;

comment on column public.bonuses.is_no_deposit is
  'Structured no-deposit flag, orthogonal to free_spins and bonus_type, so one offer can belong to BOTH /bonusuri/bonus-fara-depunere and /bonusuri/rotiri-gratuite-fara-depunere without duplication. Editable in CMS; one-time backfill only.';
comment on column public.bonuses.is_no_wagering is
  'Structured no-wagering flag. wagering_multiplier is NULL (unknown) for all rows, so "fără rulaj" cannot be derived; this explicit flag is the verifiable signal. Editable in CMS; one-time backfill only.';

-- ── 3. slug-collision guards at the DB level (game + casino namespaces) ───────
-- SECURITY DEFINER + pinned search_path so the checks see ALL rows (incl. draft categories)
-- regardless of the writer's RLS view. EXECUTE is revoked from PUBLIC: these are trigger-only
-- functions (a direct call errors anyway, but we revoke to block unauthorized direct calls).

create or replace function public.seo_category_slug_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.namespace = 'game' and exists (select 1 from public.games g where g.slug = new.slug) then
    raise exception 'Slug "%" is already used by a game — choose another category slug', new.slug
      using errcode = 'unique_violation';
  elsif new.namespace = 'casino' and exists (select 1 from public.casinos c where c.slug = new.slug) then
    raise exception 'Slug "%" is already used by a casino — choose another category slug', new.slug
      using errcode = 'unique_violation';
  end if;
  return new;
end $$;
revoke execute on function public.seo_category_slug_guard() from public;
drop trigger if exists trg_seo_categories_slug_guard on public.seo_categories;
create trigger trg_seo_categories_slug_guard
  before insert or update of slug, namespace on public.seo_categories
  for each row execute function public.seo_category_slug_guard();

create or replace function public.game_slug_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.seo_categories sc where sc.namespace = 'game' and sc.slug = new.slug) then
    raise exception 'Slug "%" is reserved by a game category', new.slug using errcode = 'unique_violation';
  end if;
  return new;
end $$;
revoke execute on function public.game_slug_guard() from public;
drop trigger if exists trg_games_slug_guard on public.games;
create trigger trg_games_slug_guard
  before insert or update of slug on public.games
  for each row execute function public.game_slug_guard();

create or replace function public.casino_slug_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.seo_categories sc where sc.namespace = 'casino' and sc.slug = new.slug) then
    raise exception 'Slug "%" is reserved by a casino category', new.slug using errcode = 'unique_violation';
  end if;
  return new;
end $$;
revoke execute on function public.casino_slug_guard() from public;
drop trigger if exists trg_casinos_slug_guard on public.casinos;
create trigger trg_casinos_slug_guard
  before insert or update of slug on public.casinos
  for each row execute function public.casino_slug_guard();

-- ── ROLLBACK (documented; do NOT run as part of apply) ───────────────────────
-- A) IMMEDIATE rollback — before any CMS use (seo_categories still empty, flags hold only the
--    bonus_type-derivable backfill): LOSSLESS. Run:
--      drop trigger if exists trg_casinos_slug_guard on public.casinos;
--      drop trigger if exists trg_games_slug_guard on public.games;
--      drop trigger if exists trg_seo_categories_slug_guard on public.seo_categories;
--      drop function if exists public.casino_slug_guard();
--      drop function if exists public.game_slug_guard();
--      drop function if exists public.seo_category_slug_guard();
--      alter table public.bonuses drop column if exists is_no_wagering;
--      alter table public.bonuses drop column if exists is_no_deposit;
--      drop table if exists public.seo_categories;
--
-- B) LATER rollback — AFTER editorial data exists: the SAME drops are DESTRUCTIVE and NOT
--    lossless. Dropping seo_categories destroys all category content (name/meta/h1/intro/body/
--    faq/status); dropping the flags destroys editorial overlap decisions (a free-spins offer
--    manually marked no-deposit) that are NOT re-derivable from bonus_type. Prefer a
--    NON-DESTRUCTIVE disable instead: revert the reading code / set categories to 'archived'
--    (hidden from public + sitemap) and leave the columns in place. Export seo_categories
--    first if a true teardown is ever required.
