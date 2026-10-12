-- 0016: admin-managed redirects. anon reads ACTIVE only (proxy needs it); admin-only
-- write; no physical delete (deactivate via is_active). Reuses is_admin()/set_updated_at.
-- No service_role. Idempotent — safe to re-run. Apply in the Supabase SQL editor.

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code smallint not null default 301 check (status_code in (301, 302)),
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_redirects_active on public.redirects (from_path) where is_active;

-- Defense-in-depth: both paths must be internal (single leading slash, not //).
-- The Server Action does the fuller check (reserved prefixes, control chars).
alter table public.redirects drop constraint if exists redirects_from_internal;
alter table public.redirects add constraint redirects_from_internal
  check (from_path ~ '^/([^/].*)?$');
alter table public.redirects drop constraint if exists redirects_to_internal;
alter table public.redirects add constraint redirects_to_internal
  check (to_path ~ '^/([^/].*)?$');

alter table public.redirects enable row level security;

drop policy if exists "redirects public active" on public.redirects;
create policy "redirects public active" on public.redirects
  for select to anon, authenticated using (is_active);

drop policy if exists "redirects admin read all" on public.redirects;
create policy "redirects admin read all" on public.redirects
  for select to authenticated using (public.is_admin());

drop policy if exists "redirects admin insert" on public.redirects;
create policy "redirects admin insert" on public.redirects
  for insert to authenticated with check (public.is_admin());

drop policy if exists "redirects admin update" on public.redirects;
create policy "redirects admin update" on public.redirects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select         on public.redirects to anon, authenticated;
grant insert, update on public.redirects to authenticated;

drop trigger if exists trg_redirects_updated_at on public.redirects;
create trigger trg_redirects_updated_at before update on public.redirects
  for each row execute function public.set_updated_at();
