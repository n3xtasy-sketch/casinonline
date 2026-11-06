-- 0038 — Editorial SEO destination override for bonus offers (URL-1.1).
--
-- Adds an OPTIONAL editor-chosen canonical SEO destination for an offer: a reference to an operator
-- evergreen page (seo_bonus_pages). NULL = destination is resolved automatically (resolveOfferDestination).
-- No backfill (decision 3): existing offers stay NULL → automatic resolution, unchanged behaviour.
--
-- Integrity (decision 2): the referenced page MUST belong to the SAME operator as the offer. This is
-- enforced by a trigger at both mutation paths (writing the ref/casino on bonuses, and moving a page
-- to another operator). PUBLICATION is NOT enforced here — a page's status can change later, so the
-- resolver validates published + semantic compatibility at runtime (decision 2 + G).
--
-- Additive + version-safe (no PG15-only syntax). SECURITY DEFINER functions with a pinned search_path;
-- EXECUTE revoked from public. Mirrors the pattern of 0036 (seo_bonus_pages_featured_guard).
-- NOT YET APPLIED to DEV or PROD — review the checklist in the report before running.

-- ── 1. Column: optional FK to the chosen evergreen page ──────────────────────────
alter table public.bonuses
  add column if not exists seo_destination_page_id uuid
    references public.seo_bonus_pages (id) on delete set null;

comment on column public.bonuses.seo_destination_page_id is
  'URL-1.1: optional editorial SEO destination (operator evergreen page). NULL = resolved automatically. Must belong to the same casino_id (enforced by trigger); publication + semantic fit validated at runtime.';

-- Partial index: the column is NULL for almost all rows; speeds the inverse guard''s reverse lookup.
create index if not exists idx_bonuses_seo_destination
  on public.bonuses (seo_destination_page_id)
  where seo_destination_page_id is not null;

-- ── 2. Forward guard: the chosen page must belong to the offer''s operator ────────
-- Fires when the offer''s destination ref OR its operator (casino_id) is written.
create or replace function public.bonuses_seo_destination_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.seo_destination_page_id is not null then
    if not exists (
      select 1 from public.seo_bonus_pages p
      where p.id = new.seo_destination_page_id and p.casino_id = new.casino_id
    ) then
      raise exception 'Destinația SEO (%) nu aparține operatorului ofertei', new.seo_destination_page_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.bonuses_seo_destination_guard() from public;
drop trigger if exists trg_bonuses_seo_destination_guard on public.bonuses;
create trigger trg_bonuses_seo_destination_guard
  before insert or update of seo_destination_page_id, casino_id on public.bonuses
  for each row execute function public.bonuses_seo_destination_guard();

-- ── 3. Inverse guard: block moving a page to another operator while it is a destination ──
-- seo_bonus_pages.casino_id is editable; changing it would leave a cross-operator destination the
-- forward guard never re-checks. Reject the UPDATE (admin must clear the referencing offers first).
create or replace function public.seo_bonus_pages_destination_casino_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.casino_id is distinct from old.casino_id then
    if exists (
      select 1 from public.bonuses b
      where b.seo_destination_page_id = new.id and b.casino_id = old.casino_id
    ) then
      raise exception 'Pagina % este destinația SEO a unor oferte ale operatorului curent; mută/șterge mai întâi referințele', new.id
        using errcode = 'foreign_key_violation';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.seo_bonus_pages_destination_casino_guard() from public;
drop trigger if exists trg_seo_bonus_pages_destination_casino_guard on public.seo_bonus_pages;
create trigger trg_seo_bonus_pages_destination_casino_guard
  before update of casino_id on public.seo_bonus_pages
  for each row execute function public.seo_bonus_pages_destination_casino_guard();
