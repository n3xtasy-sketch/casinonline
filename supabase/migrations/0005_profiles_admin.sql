-- 0005: admin auth — profiles table with is_admin role.
-- Apply in the Supabase SQL editor (DDL can't run through the anon/REST client).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may read ONLY their own profile (to check is_admin).
-- Intentionally NO insert/update/delete policy → users cannot grant themselves admin.
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

grant select on public.profiles to authenticated;

-- Auto-create a profile (is_admin=false) whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin-only count for the locked affiliate_links table (dashboard widget).
-- Returns the real count only for admins, 0 otherwise.
create or replace function public.admin_affiliate_links_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint from public.affiliate_links
  where coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

revoke all on function public.admin_affiliate_links_count() from public;
grant execute on function public.admin_affiliate_links_count() to authenticated;
