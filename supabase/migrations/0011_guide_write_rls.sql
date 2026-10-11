-- 0011: admin-only WRITE access for guides (CREATE + UPDATE; no physical delete).
-- Public SELECT from 0001 stays. Reuses is_admin() from 0006. No service_role.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

grant insert, update on public.guides to authenticated;

drop policy if exists "guides admin insert" on public.guides;
create policy "guides admin insert" on public.guides
  for insert to authenticated with check (public.is_admin());

drop policy if exists "guides admin update" on public.guides;
create policy "guides admin update" on public.guides
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
