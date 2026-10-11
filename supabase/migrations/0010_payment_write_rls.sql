-- 0010: admin-only WRITE access for payment_methods (CREATE + UPDATE; no physical delete).
-- casino_payment_methods junction (insert/delete sync) is already covered by 0006.
-- Public SELECT from 0001 stays. Reuses is_admin() from 0006. No service_role.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

grant insert, update on public.payment_methods to authenticated;

drop policy if exists "payment_methods admin insert" on public.payment_methods;
create policy "payment_methods admin insert" on public.payment_methods
  for insert to authenticated with check (public.is_admin());

drop policy if exists "payment_methods admin update" on public.payment_methods;
create policy "payment_methods admin update" on public.payment_methods
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
