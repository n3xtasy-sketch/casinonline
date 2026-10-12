-- 0018: unified draft|published|archived publishing model (shared ENUM) across all 6
-- content entities. Public (anon) sees ONLY published; admins see all — RLS is the single
-- source of truth. casinos.status active→published (no loss), converted text→enum; other
-- entities backfilled published then default new rows to draft. No service_role, no physical
-- delete. Idempotent — safe to re-run. Apply in the Supabase SQL editor.

-- Shared enum.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

-- ===================== casinos: migrate text(active|archived) → enum =====================
-- Drop the status-dependent policy FIRST — Postgres forbids altering a column's type
-- while a policy references it. Recreated (as published) after the conversion.
drop policy if exists "casinos public read active" on public.casinos;
drop policy if exists "casinos public read published" on public.casinos;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'casinos'
      and column_name = 'status' and data_type <> 'USER-DEFINED'
  ) then
    -- Drop the old CHECK + default FIRST (they only allow active|archived), otherwise
    -- the migrate-to-published update would violate the old constraint.
    alter table public.casinos drop constraint if exists casinos_status_check;
    alter table public.casinos alter column status drop default;
    update public.casinos set status = 'published' where status = 'active';
    alter table public.casinos alter column status type public.content_status
      using status::public.content_status;
    alter table public.casinos alter column status set default 'draft';
  end if;
end $$;

create policy "casinos public read published" on public.casinos
  for select to anon, authenticated using (status = 'published');
-- "casinos admin read all" (0012) stays.

-- ===================== games/providers/payment_methods/guides/bonuses =====================
-- Add enum status: backfill existing = published (stay visible), default new = draft.

-- games
alter table public.games add column if not exists status public.content_status not null default 'published';
alter table public.games alter column status set default 'draft';
create index if not exists idx_games_status on public.games (status);
drop policy if exists "games read" on public.games;
drop policy if exists "games public published" on public.games;
create policy "games public published" on public.games for select to anon, authenticated using (status = 'published');
drop policy if exists "games admin read all" on public.games;
create policy "games admin read all" on public.games for select to authenticated using (public.is_admin());

-- providers
alter table public.providers add column if not exists status public.content_status not null default 'published';
alter table public.providers alter column status set default 'draft';
create index if not exists idx_providers_status on public.providers (status);
drop policy if exists "providers read" on public.providers;
drop policy if exists "providers public published" on public.providers;
create policy "providers public published" on public.providers for select to anon, authenticated using (status = 'published');
drop policy if exists "providers admin read all" on public.providers;
create policy "providers admin read all" on public.providers for select to authenticated using (public.is_admin());

-- payment_methods
alter table public.payment_methods add column if not exists status public.content_status not null default 'published';
alter table public.payment_methods alter column status set default 'draft';
create index if not exists idx_payment_methods_status on public.payment_methods (status);
drop policy if exists "payment_methods read" on public.payment_methods;
drop policy if exists "payment_methods public published" on public.payment_methods;
create policy "payment_methods public published" on public.payment_methods for select to anon, authenticated using (status = 'published');
drop policy if exists "payment_methods admin read all" on public.payment_methods;
create policy "payment_methods admin read all" on public.payment_methods for select to authenticated using (public.is_admin());

-- guides
alter table public.guides add column if not exists status public.content_status not null default 'published';
alter table public.guides alter column status set default 'draft';
create index if not exists idx_guides_status on public.guides (status);
drop policy if exists "guides read" on public.guides;
drop policy if exists "guides public published" on public.guides;
create policy "guides public published" on public.guides for select to anon, authenticated using (status = 'published');
drop policy if exists "guides admin read all" on public.guides;
create policy "guides admin read all" on public.guides for select to authenticated using (public.is_admin());

-- bonuses
alter table public.bonuses add column if not exists status public.content_status not null default 'published';
alter table public.bonuses alter column status set default 'draft';
create index if not exists idx_bonuses_status on public.bonuses (status);
drop policy if exists "bonuses read" on public.bonuses;
drop policy if exists "bonuses public published" on public.bonuses;
create policy "bonuses public published" on public.bonuses for select to anon, authenticated using (status = 'published');
drop policy if exists "bonuses admin read all" on public.bonuses;
create policy "bonuses admin read all" on public.bonuses for select to authenticated using (public.is_admin());

-- ===================== affiliate RPC: active→published =====================
create or replace function public.get_affiliate_url(p_slug text)
returns text language sql security definer set search_path = public stable as $$
  select al.url
  from public.affiliate_links al
  join public.casinos c on c.id = al.casino_id
  where c.slug = p_slug and al.is_active and c.status = 'published'
  order by case when al.placement = 'review_cta' then 0 else 1 end
  limit 1
$$;
