-- 0009: admin-only WRITE access for providers (CREATE + UPDATE; no physical delete).
-- Public SELECT from 0001 stays. Reuses is_admin() from 0006. No service_role.
-- providers.game_count stays owned by the 0008 trigger (sync_provider_game_count) —
-- the provider form never writes it; admins only edit editorial fields.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

grant insert, update on public.providers to authenticated;

drop policy if exists "providers admin insert" on public.providers;
create policy "providers admin insert" on public.providers
  for insert to authenticated with check (public.is_admin());

drop policy if exists "providers admin update" on public.providers;
create policy "providers admin update" on public.providers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
