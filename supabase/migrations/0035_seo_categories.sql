-- 0035_seo_categories.sql  (FAZA SEO-B — category architecture)  [v2, post review]
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
--      resolve classification OVERLAPS in the data model without duplicating offers:
--        * is_no_deposit: an offer can be BOTH "rotiri gratuite" (free_spins>0) AND "fără
--          depunere" at once.
--        * is_no_wagering: "fără rulaj" is NOT derivable — wagering_multiplier is NULL for
--          every current row (NULL = unknown, not zero), so an explicit flag is required.
--      "free spins" reuses free_spins; welcome/cashback reuse bonus_type → these two flags are
--      the only new classification columns.
--   3) DB-level slug-collision guards (triggers, both directions) for the game/casino
--      namespaces, where a category and an entity share one URL space (/pacanele-online/[x],
--      /cazinouri-online/[x]). Reserves category slugs of ANY status (incl. draft) so a future
--      publish never collides. Bonus categories live under /bonusuri while offers live under
--      /bonusuri-casino → no cross-collision, so no guard needed there.
--
-- Depends on: content_status enum (0018), public.set_updated_at(), public.is_admin() (0005),
-- games/casinos/bonuses/bonus_types (0001). All present in DEV (verified DEV↔PROD parity).
-- Verified: no existing game/casino slug collides with the planned category slugs.

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

-- RLS: public (anon) reads ONLY published; admins manage everything (is_admin()). Mirrors the
-- publishing model (0018) + anon least-privilege (0030). Non-admin authenticated users have no
-- write policy → RLS denies INSERT/UPDATE/DELETE even though the table privilege is granted.
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

-- ── 2. bonus classification flags (overlap resolvers) ────────────────────────
alter table public.bonuses add column if not exists is_no_deposit boolean not null default false;
alter table public.bonuses add column if not exists is_no_wagering boolean not null default false;

-- Conservative, TRUTHFUL backfill: only offers explicitly typed as such. Overlap cases
-- (e.g. a free-spins offer that is ALSO no-deposit, or a welcome offer with no wagering) are
-- set editorially in the CMS afterwards — we never guess from free-text.
update public.bonuses b set is_no_deposit = true
  from public.bonus_types t
  where b.bonus_type_id = t.id and t.slug = 'fara-depunere' and b.is_no_deposit = false;
update public.bonuses b set is_no_wagering = true
  from public.bonus_types t
  where b.bonus_type_id = t.id and t.slug = 'fara-rulaj' and b.is_no_wagering = false;

comment on column public.bonuses.is_no_deposit is
  'Structured no-deposit flag, orthogonal to free_spins and bonus_type, so one offer can belong to BOTH /bonusuri/bonus-fara-depunere and /bonusuri/rotiri-gratuite-fara-depunere without duplication.';
comment on column public.bonuses.is_no_wagering is
  'Structured no-wagering flag. wagering_multiplier is NULL (unknown) for all rows, so "fără rulaj" cannot be derived; this explicit flag is the verifiable signal.';

-- ── 3. slug-collision guards at the DB level (game + casino namespaces) ───────
-- A category slug must not collide with an entity slug sharing the same URL space, and vice
-- versa — enforced regardless of status (draft slugs are reserved too). SECURITY DEFINER so the
-- checks see ALL rows (incl. draft categories) irrespective of the writer's RLS view.

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
drop trigger if exists trg_casinos_slug_guard on public.casinos;
create trigger trg_casinos_slug_guard
  before insert or update of slug on public.casinos
  for each row execute function public.casino_slug_guard();
