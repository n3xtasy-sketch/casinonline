-- 0007: admin-only WRITE access for bonuses (CREATE + UPDATE; no delete this phase).
-- Public SELECT from 0001 stays. Reuses is_admin() from 0006. No service_role.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

grant insert, update on public.bonuses to authenticated;

drop policy if exists "bonuses admin insert" on public.bonuses;
create policy "bonuses admin insert" on public.bonuses
  for insert to authenticated with check (public.is_admin());

drop policy if exists "bonuses admin update" on public.bonuses;
create policy "bonuses admin update" on public.bonuses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
