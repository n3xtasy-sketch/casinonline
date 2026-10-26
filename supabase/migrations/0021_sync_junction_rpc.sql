-- 0021_sync_junction_rpc.sql
-- Atomic junction sync for Admin relation edits (casino_tags / casino_games /
-- casino_payment_methods). The delete-all + re-insert run INSIDE one function
-- transaction, so a failing insert rolls back the delete → existing relations are
-- never lost, and a partially-applied save can't be reported as success.
--
-- SECURITY INVOKER (default — NOT definer): the function runs with the caller's
-- role, so the existing RLS write policies (0006: is_admin()) and table GRANTs
-- still apply. A non-admin's call is rejected by RLS inside the function → no
-- privilege escalation. Table/column whitelist + format(%I) prevent SQL injection.
-- Additive: no table/column/data changes.

create or replace function public.sync_junction(
  p_table text,
  p_self_col text,
  p_self_id uuid,
  p_other_col text,
  p_other_ids uuid[]
) returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Whitelist the FULL (table, self_col, other_col) combination — not each name
  -- independently — so a valid-but-mismatched pair (e.g. casino_tags/game_id)
  -- can never reach the dynamic SQL. These 5 triples are exactly what the Admin
  -- forms and the CSV importer use.
  if (p_table, p_self_col, p_other_col) not in (
    ('casino_tags', 'casino_id', 'tag_id'),
    ('casino_games', 'casino_id', 'game_id'),
    ('casino_games', 'game_id', 'casino_id'),
    ('casino_payment_methods', 'casino_id', 'payment_method_id'),
    ('casino_payment_methods', 'payment_method_id', 'casino_id')
  ) then
    raise exception 'sync_junction: combination (%, %, %) not allowed', p_table, p_self_col, p_other_col
      using errcode = '42501';
  end if;

  -- One transaction (function body): if the insert below raises, this delete is
  -- rolled back and the pre-existing relations remain intact.
  execute format('delete from public.%I where %I = $1', p_table, p_self_col)
    using p_self_id;

  if p_other_ids is not null and array_length(p_other_ids, 1) is not null then
    execute format(
      'insert into public.%I (%I, %I) select $1, x from unnest($2::uuid[]) as t(x)',
      p_table, p_self_col, p_other_col
    ) using p_self_id, p_other_ids;
  end if;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION; revoke it so
-- anon can't even invoke the function (writes are already blocked by RLS + the
-- missing insert/delete grants for anon — this is defense in depth, mirroring
-- is_admin() in 0006).
revoke all on function public.sync_junction(text, text, uuid, text, uuid[]) from public;
grant execute on function public.sync_junction(text, text, uuid, text, uuid[]) to authenticated;
