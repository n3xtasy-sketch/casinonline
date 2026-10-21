-- 0022_import_apply_row_rpc.sql
-- Atomic per-row apply for CSV UPSERT updates: the scalar patch AND every m2m
-- relation sync for one row run INSIDE a single function transaction. If any
-- step raises (constraint, RLS, whitelist), the whole row rolls back — scalars
-- and all relations return to their initial state. No partial updates.
--
-- SECURITY INVOKER (default — NOT definer): runs with the caller's role, so the
-- existing RLS write policies (0006: is_admin()) and table GRANTs still apply.
-- A non-admin's writes are rejected by RLS inside the transaction → rollback, no
-- privilege escalation. Strict table + column whitelist + format(%I) prevent any
-- arbitrary table/column coming from a CSV. Relation sync REUSES sync_junction
-- (0021), which carries its own junction whitelist and atomic delete+insert.
-- Additive: no table/column/data changes.

create or replace function public.import_apply_row(
  p_table text,
  p_id uuid,
  p_patch jsonb default '{}'::jsonb,
  p_junctions jsonb default '[]'::jsonb
) returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  allowed text[];
  k text;
  set_clause text := '';
  j jsonb;
  n_rows integer;
begin
  -- Strict table + column whitelist (mirrors src/lib/io/apply-row.ts WRITABLE_COLUMNS).
  if p_table = 'casinos' then
    allowed := array['slug','offer_url','name','logo_url','rating','editor_score','license',
      'payout_speed','withdrawal_time','verified_at','min_deposit','kyc','support','mobile',
      'intro','editor_review','pros','cons'];
  elsif p_table = 'bonuses' then
    allowed := array['slug','claim_url','casino_id','bonus_type_id','offer','free_spins','wagering',
      'code','min_deposit','validity','intro','terms','pros','cons','how_to_claim'];
  elsif p_table = 'games' then
    allowed := array['slug','name','thumbnail_url','rtp','volatility','max_win','release_year',
      'reels','paylines','bet_range','intro','mechanics','bonus_features','provider_id','category_id'];
  elsif p_table = 'providers' then
    allowed := array['slug','name','logo_url','category','founded','country','specialty','rtp_range','intro'];
  elsif p_table = 'payment_methods' then
    allowed := array['slug','name','logo_url','deposit_speed','withdrawal_speed','fees','min_limit',
      'max_limit','intro','deposits','withdrawals','pros','cons','payment_type_id'];
  elsif p_table = 'guides' then
    allowed := array['slug','title','excerpt','image_url','author','intro','reading_time',
      'category_id','sections','faq','related_links'];
  else
    raise exception 'import_apply_row: table % not allowed', p_table using errcode = '42501';
  end if;

  -- Scalar patch: only whitelisted keys, type-coerced via the table rowtype
  -- (jsonb_populate_record uses each column's real type; json null → SQL NULL = __CLEAR__).
  -- When there is no patch we still run a no-op UPDATE so the row's existence AND
  -- the caller's RLS updatability are verified the same way (via ROW_COUNT below)
  -- BEFORE any relation is touched.
  if p_patch is not null and p_patch <> '{}'::jsonb then
    for k in select jsonb_object_keys(p_patch) loop
      if not (k = any(allowed)) then
        raise exception 'import_apply_row: column % not allowed for %', k, p_table using errcode = '42501';
      end if;
      set_clause := set_clause || format('%I = m.%I,', k, k);
    end loop;
    set_clause := left(set_clause, length(set_clause) - 1); -- strip trailing comma
    execute format(
      'update public.%I t set %s from (select (jsonb_populate_record(null::public.%I, $2)).*) m where t.id = $1',
      p_table, set_clause, p_table
    ) using p_id, p_patch;
  else
    -- no scalar change → no-op self-assignment, purely to probe existence + RLS
    execute format('update public.%I set slug = slug where id = $1', p_table) using p_id;
  end if;

  -- The target must exist AND be updatable by the caller (RLS). A hidden row (RLS)
  -- or a missing id updates 0 rows → abort here, so relations are NEVER synced for
  -- a row the caller can't update. This gates non-admin authenticated callers too.
  get diagnostics n_rows = row_count;
  if n_rows = 0 then
    raise exception 'import_apply_row: row % in % not found or not updatable (RLS)', p_id, p_table
      using errcode = 'P0002';
  end if;

  -- Relations: reuse the atomic sync_junction (0021). Same transaction, so a failing
  -- junction rolls back the scalar update above and every prior junction too.
  -- Only junctions AUTHORIZED for p_table are accepted — the payload can't attach an
  -- arbitrary junction (self_col is pinned to p_table's own id column).
  for j in select value from jsonb_array_elements(coalesce(p_junctions, '[]'::jsonb)) loop
    if (p_table, j ->> 'table', j ->> 'self_col', j ->> 'other_col') not in (
      ('casinos', 'casino_tags', 'casino_id', 'tag_id'),
      ('casinos', 'casino_games', 'casino_id', 'game_id'),
      ('casinos', 'casino_payment_methods', 'casino_id', 'payment_method_id'),
      ('games', 'casino_games', 'game_id', 'casino_id'),
      ('payment_methods', 'casino_payment_methods', 'payment_method_id', 'casino_id')
    ) then
      raise exception 'import_apply_row: junction % not allowed for table %', j ->> 'table', p_table
        using errcode = '42501';
    end if;
    perform public.sync_junction(
      (j ->> 'table'),
      (j ->> 'self_col'),
      p_id,
      (j ->> 'other_col'),
      coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(j -> 'ids') as x), '{}'::uuid[])
    );
  end loop;
end;
$$;

-- Same grant model as sync_junction (0021): revoke PUBLIC's default execute so anon
-- can't invoke it (defense in depth — RLS + missing table grants already block anon),
-- grant only to authenticated (the role the Admin import runs as).
revoke all on function public.import_apply_row(text, uuid, jsonb, jsonb) from public;
grant execute on function public.import_apply_row(text, uuid, jsonb, jsonb) to authenticated;
