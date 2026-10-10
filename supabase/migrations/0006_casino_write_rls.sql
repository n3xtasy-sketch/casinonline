-- 0006: admin-only WRITE access for the casino module (+ its relations).
-- First casino CRUD = CREATE + UPDATE only (no casino DELETE in this phase).
-- Public SELECT policies from 0001 stay intact (policies are permissive/OR-combined).
-- No service_role — admins write via their session; RLS gates everything by is_admin().
-- Apply in the Supabase SQL editor (DDL can't run through the anon/REST client).

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Operation privileges (RLS still decides which rows / who). No DELETE on casinos.
grant insert, update         on public.casinos                to authenticated;
grant insert, delete         on public.casino_tags            to authenticated;
grant insert, delete         on public.casino_payment_methods to authenticated;
grant insert, delete         on public.casino_games           to authenticated;
grant select, insert, update on public.affiliate_links        to authenticated;

-- casinos: admins may INSERT + UPDATE only (no delete this phase); public read stays
create policy "casinos admin insert" on public.casinos
  for insert to authenticated with check (public.is_admin());
create policy "casinos admin update" on public.casinos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- M2M junctions: admins may insert/delete to sync relations; public read stays
create policy "casino_tags admin insert" on public.casino_tags
  for insert to authenticated with check (public.is_admin());
create policy "casino_tags admin delete" on public.casino_tags
  for delete to authenticated using (public.is_admin());
create policy "casino_pm admin insert" on public.casino_payment_methods
  for insert to authenticated with check (public.is_admin());
create policy "casino_pm admin delete" on public.casino_payment_methods
  for delete to authenticated using (public.is_admin());
create policy "casino_games admin insert" on public.casino_games
  for insert to authenticated with check (public.is_admin());
create policy "casino_games admin delete" on public.casino_games
  for delete to authenticated using (public.is_admin());

-- affiliate_links: admin-only read/insert/update (no delete granted this phase);
-- anon stays blocked, /go/ keeps using the SECURITY DEFINER RPC.
create policy "affiliate_links admin all" on public.affiliate_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
