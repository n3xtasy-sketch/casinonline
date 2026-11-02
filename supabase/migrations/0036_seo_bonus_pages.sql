-- 0036_seo_bonus_pages.sql  (FAZA SEO-C E1 — evergreen operator bonus pages)
--
-- Evergreen pages /cazinouri-online/[operator]/[bonus-intent]. Additive + idempotent; safe on
-- populated data. Apply DEV first, then (later, with approval) PROD — BEFORE deploying the code
-- that reads these. NO seed, NO auto-publish, NO change to commercial offers.
--
-- DESIGN (integrates the SEO-C review + the "single source of truth" requirement):
--   * SEO INTENT ≠ bonus_type. A page is keyed by (casino_id, intent) where `intent` is a
--     SEO-intent SLUG from the APP registry (src/lib/seo-categories.ts selectors, reused), NOT a
--     bonus_type FK. One commercial offer can therefore back SEVERAL intents (e.g. a free-spins
--     no-deposit offer powers both /…/bonus-fara-depunere and /…/rotiri-gratuite-fara-depunere)
--     without being limited to one URL per bonus_type. `intent` is kept as free text (validated
--     in the app against the registry) so new intents need only app code, not a DB migration.
--   * SINGLE SOURCE OF TRUTH: this table holds ONLY editorial content + a REFERENCE to the
--     featured offer. It stores NO commercial data (value / free_spins / wagering / code /
--     expiry / CTA) — those live exclusively in `bonuses`. The page reads the live offer via
--     featured_bonus_id at render; an offer edit (which already fires updateTag('bonuses'))
--     propagates everywhere, incl. this page. Editorial edits fire updateTag('seo_bonus_pages').
--   * NO UNIQUE(casino_id, bonus_type_id) on `bonuses` (multiple offers of a type stay allowed).
--
-- Depends on: content_status enum (0018), public.set_updated_at(), public.is_admin() (0005),
-- casinos + bonuses (0001). Verified present in DEV + PROD; seo_bonus_pages absent in both.

-- ── 1. table ────────────────────────────────────────────────────────────────
create table if not exists public.seo_bonus_pages (
  id uuid primary key default gen_random_uuid(),
  casino_id uuid not null references public.casinos(id) on delete cascade,
  -- SEO intent slug = URL segment (e.g. bonus-fara-depunere, rotiri-gratuite-fara-depunere,
  -- bonus-fara-rulaj, bonus-de-bun-venit, bonus-cashback). Resolved to a deterministic predicate
  -- in app code (reused from SEO-B); decoupled from the commercial bonus_type.
  intent text not null,
  -- Reference to the CURRENT featured offer (nullable). ON DELETE SET NULL: deleting an offer
  -- keeps the page (editorial survives), only clears the feature. Same-operator + intent-match
  -- are enforced below (DB: same-operator; app: intent-match).
  featured_bonus_id uuid references public.bonuses(id) on delete set null,
  -- Editorial content, independent of the offer:
  h1 text,
  intro text,
  body text,
  faq jsonb not null default '[]'::jsonb,
  meta_title text,
  meta_description text,
  status public.content_status not null default 'draft',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One evergreen page per (operator, intent). Allows the SAME offer to back different intents.
  constraint uq_seo_bonus_pages_casino_intent unique (casino_id, intent),
  -- Slug-format guard (cheap DB defense). Membership in the intent REGISTRY is validated
  -- server-side in the CMS against src/lib/seo-categories.ts (the registry is the single source
  -- of valid intents; kept in code so new intents need no DB migration — chosen over an SQL
  -- enum CHECK, which would drift, and over a dedicated intents table, which is overengineering
  -- since the intent→predicate mapping must live in code anyway).
  constraint seo_bonus_pages_intent_format check (intent ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index if not exists idx_seo_bonus_pages_casino on public.seo_bonus_pages (casino_id);
create index if not exists idx_seo_bonus_pages_status on public.seo_bonus_pages (status);

drop trigger if exists trg_seo_bonus_pages_updated_at on public.seo_bonus_pages;
create trigger trg_seo_bonus_pages_updated_at before update on public.seo_bonus_pages
  for each row execute function public.set_updated_at();

-- ── 2. RLS: public reads ONLY published; admin manages all statuses ──────────
alter table public.seo_bonus_pages enable row level security;
drop policy if exists "seo_bonus_pages public published" on public.seo_bonus_pages;
create policy "seo_bonus_pages public published" on public.seo_bonus_pages
  for select to anon, authenticated using (status = 'published');
drop policy if exists "seo_bonus_pages admin all" on public.seo_bonus_pages;
create policy "seo_bonus_pages admin all" on public.seo_bonus_pages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.seo_bonus_pages from anon;
grant select on public.seo_bonus_pages to anon;
grant select, insert, update, delete on public.seo_bonus_pages to authenticated;

-- ── 3. featured_bonus_id integrity: the offer MUST belong to the page's operator ──
-- DB enforces same-operator (prevents picking another operator's offer, accidentally or not).
-- Intent-compatibility (the offer actually matches the SEO intent) is a code predicate
-- (bonusMatches in src/lib/seo-categories.ts) → enforced server-side in the CMS, not here.
-- SECURITY DEFINER + pinned search_path; EXECUTE revoked from public (trigger-only).
create or replace function public.seo_bonus_pages_featured_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.featured_bonus_id is not null then
    if not exists (
      select 1 from public.bonuses b
      where b.id = new.featured_bonus_id and b.casino_id = new.casino_id
    ) then
      raise exception 'Oferta featured (%) nu aparține operatorului paginii', new.featured_bonus_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.seo_bonus_pages_featured_guard() from public;
drop trigger if exists trg_seo_bonus_pages_featured_guard on public.seo_bonus_pages;
create trigger trg_seo_bonus_pages_featured_guard
  before insert or update of featured_bonus_id, casino_id on public.seo_bonus_pages
  for each row execute function public.seo_bonus_pages_featured_guard();

-- ── 3b. INVERSE integrity: block re-assigning a FEATURED offer to another operator ──
-- The forward guard only fires on writes to seo_bonus_pages. The inverse is possible:
-- bonuses.casino_id IS editable (admin bonus form), so changing it while the offer is featured
-- on a page of the OLD operator would leave a cross-operator relation the forward guard never
-- re-checks. This trigger on bonuses blocks that UPDATE (admin must un-feature first). Additive;
-- never changes commercial data — it only rejects an integrity-breaking UPDATE. Version-safe
-- (no PG15-only FK syntax). SECURITY DEFINER + pinned search_path; EXECUTE revoked from public.
create or replace function public.bonuses_featured_casino_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.casino_id is distinct from old.casino_id
     and exists (
       select 1 from public.seo_bonus_pages p
       where p.featured_bonus_id = old.id and p.casino_id <> new.casino_id
     ) then
    raise exception 'Oferta % este featured pe o pagină evergreen a operatorului curent — anulează featuring-ul înainte de a schimba operatorul ofertei', old.id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;
revoke execute on function public.bonuses_featured_casino_guard() from public;
drop trigger if exists trg_bonuses_featured_casino_guard on public.bonuses;
create trigger trg_bonuses_featured_casino_guard
  before update of casino_id on public.bonuses
  for each row execute function public.bonuses_featured_casino_guard();

-- ── DELETE / UPDATE behavior (documented) ────────────────────────────────────
--   * casino deleted            → its evergreen pages deleted (ON DELETE CASCADE).
--   * featured bonus deleted     → featured_bonus_id set NULL; page + editorial survive.
--   * featured bonus expired/archived/draft → NO schema effect; "is the offer live" is computed
--     at render (bonus.status='published' AND (expires_at is null OR expires_at >= today)).
--     If not live: page stays published, renders editorial, shows NO commercial CTA / not
--     presented as active (handled in app, E2). URL stays stable.
--   * page with no active/featured offer → remains publishable + editable editorially.
--
-- ── ROLLBACK (do NOT run as part of apply) ───────────────────────────────────
-- A) IMMEDIATE (before any CMS use, table empty) — LOSSLESS:
--      drop trigger if exists trg_bonuses_featured_casino_guard on public.bonuses;
--      drop function if exists public.bonuses_featured_casino_guard();
--      drop trigger if exists trg_seo_bonus_pages_featured_guard on public.seo_bonus_pages;
--      drop trigger if exists trg_seo_bonus_pages_updated_at on public.seo_bonus_pages;
--      drop function if exists public.seo_bonus_pages_featured_guard();
--      drop table if exists public.seo_bonus_pages;
-- B) LATER (after editorial content exists) — DESTRUCTIVE (drops h1/intro/body/faq/meta for all
--    pages; NOT re-derivable). Prefer non-destructive: set pages to 'archived' / revert reading
--    code, keep the table; export seo_bonus_pages first if a true teardown is required.
