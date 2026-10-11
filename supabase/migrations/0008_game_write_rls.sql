-- 0008: admin-only WRITE access for games (CREATE + UPDATE; no physical delete).
-- casino_games junction (insert/delete sync) is already covered by 0006.
-- Public SELECT from 0001 stays. Reuses is_admin() from 0006. No service_role.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

grant insert, update on public.games to authenticated;

drop policy if exists "games admin insert" on public.games;
create policy "games admin insert" on public.games
  for insert to authenticated with check (public.is_admin());

drop policy if exists "games admin update" on public.games;
create policy "games admin update" on public.games
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- providers.game_count is kept in sync automatically from count(*) on games.
-- SECURITY DEFINER so it can update providers without opening that table to
-- admin writes yet (providers module comes later). Handles provider changes on
-- edit by recalculating BOTH the old and the new provider.
create or replace function public.sync_provider_game_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.provider_id is not null then
    update public.providers
      set game_count = (select count(*) from public.games where provider_id = new.provider_id)
      where id = new.provider_id;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.provider_id is not null
     and (tg_op = 'DELETE' or old.provider_id is distinct from new.provider_id) then
    update public.providers
      set game_count = (select count(*) from public.games where provider_id = old.provider_id)
      where id = old.provider_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_sync_provider_game_count on public.games;
create trigger trg_sync_provider_game_count
  after insert or update or delete on public.games
  for each row execute function public.sync_provider_game_count();
