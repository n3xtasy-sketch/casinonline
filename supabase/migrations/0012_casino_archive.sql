-- 0012: soft-archive for casinos (status active|archived). No physical delete.
-- Public (anon) sees only active; admins see everything. Affiliate RPC respects it.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

alter table public.casinos
  add column if not exists status text not null default 'active'
  check (status in ('active', 'archived'));

create index if not exists idx_casinos_status on public.casinos (status);

-- Replace the open read policy from 0001 (using true) with status-aware policies.
drop policy if exists "casinos read" on public.casinos;

create policy "casinos public read active" on public.casinos
  for select to anon, authenticated using (status = 'active');

create policy "casinos admin read all" on public.casinos
  for select to authenticated using (public.is_admin());

-- get_affiliate_url is SECURITY DEFINER (bypasses RLS) → add the status filter so an
-- archived casino no longer resolves to an operator URL. /go/<slug> then falls back
-- to the on-site (now 404) review page instead of redirecting off-site.
create or replace function public.get_affiliate_url(p_slug text)
returns text language sql security definer set search_path = public stable as $$
  select al.url
  from public.affiliate_links al
  join public.casinos c on c.id = al.casino_id
  where c.slug = p_slug and al.is_active and c.status = 'active'
  order by case when al.placement = 'review_cta' then 0 else 1 end
  limit 1
$$;
