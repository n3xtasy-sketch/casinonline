-- 0023_import_create_row_rpc.sql
-- Atomic per-row CREATE for CSV import: INSERT the new row AND sync all its m2m
-- relations INSIDE a single function transaction, returning the new id. If any
-- relation fails, the whole thing rolls back — no orphan row, no partial relations.
-- Mirrors import_apply_row (0022): same SECURITY INVOKER model, same strict table +
-- column whitelist, same per-table junction authorization, reusing sync_junction (0021).
--
-- Status is NEVER taken from the payload: new rows are forced to 'draft'. The column
-- whitelist deliberately omits 'status' and 'id', so neither can be set from CSV.
-- Additive: no table/column/data changes.

create or replace function public.import_create_row(
  p_table text,
  p_row jsonb,
  p_junctions jsonb default '[]'::jsonb
) returns uuid
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  allowed text[];
  k text;
  cols text := 'status';              -- forced column
  vals text := quote_literal('draft'); -- new rows are always draft
  j jsonb;
  new_id uuid;
begin
  -- Strict table + column whitelist (mirrors src/lib/io/apply-row.ts WRITABLE_COLUMNS,
  -- same list as import_apply_row in 0022). 'status' and 'id' are intentionally absent.
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
    raise exception 'import_create_row: table % not allowed', p_table using errcode = '42501';
  end if;

  -- Build the INSERT from only whitelisted keys (type-coerced via the table rowtype).
  -- A 'status' or 'id' key in the payload is rejected here (not in the whitelist).
  for k in select jsonb_object_keys(coalesce(p_row, '{}'::jsonb)) loop
    if not (k = any(allowed)) then
      raise exception 'import_create_row: column % not allowed for %', k, p_table using errcode = '42501';
    end if;
    cols := cols || ', ' || format('%I', k);
    vals := vals || ', ' || format('m.%I', k);
  end loop;

  execute format(
    'insert into public.%I (%s) select %s from (select (jsonb_populate_record(null::public.%I, $1)).*) m returning id',
    p_table, cols, vals, p_table
  ) using coalesce(p_row, '{}'::jsonb) into new_id;

  -- Relations: reuse the atomic sync_junction (0021), same transaction → a failing
  -- junction rolls back the INSERT above. Only junctions AUTHORIZED for p_table.
  for j in select value from jsonb_array_elements(coalesce(p_junctions, '[]'::jsonb)) loop
    if (p_table, j ->> 'table', j ->> 'self_col', j ->> 'other_col') not in (
      ('casinos', 'casino_tags', 'casino_id', 'tag_id'),
      ('casinos', 'casino_games', 'casino_id', 'game_id'),
      ('casinos', 'casino_payment_methods', 'casino_id', 'payment_method_id'),
      ('games', 'casino_games', 'game_id', 'casino_id'),
      ('payment_methods', 'casino_payment_methods', 'payment_method_id', 'casino_id')
    ) then
      raise exception 'import_create_row: junction % not allowed for table %', j ->> 'table', p_table
        using errcode = '42501';
    end if;
    perform public.sync_junction(
      (j ->> 'table'),
      (j ->> 'self_col'),
      new_id,
      (j ->> 'other_col'),
      coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(j -> 'ids') as x), '{}'::uuid[])
    );
  end loop;

  return new_id;
end;
$$;

-- Grant model (same as 0021/0022): only authenticated (the role Admin import runs as).
revoke all on function public.import_create_row(text, jsonb, jsonb) from public;
grant execute on function public.import_create_row(text, jsonb, jsonb) to authenticated;

-- Supabase's default privileges grant EXECUTE to anon for new functions, and
-- `revoke ... from public` does NOT remove that per-role grant (verified in DEV:
-- anon could still invoke sync_junction / import_apply_row). Explicitly drop anon's
-- EXECUTE on all three RPCs. authenticated (Admin) and service_role (DEV scripts /
-- server) keep access; anon has no legitimate use and is already blocked by RLS —
-- this is defense in depth. REVOKE of an absent grant is a harmless no-op.
revoke execute on function public.import_create_row(text, jsonb, jsonb) from anon;
revoke execute on function public.import_apply_row(text, uuid, jsonb, jsonb) from anon;
revoke execute on function public.sync_junction(text, text, uuid, text, uuid[]) from anon;
