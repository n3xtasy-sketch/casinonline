-- 0025_import_rpc_casinos_faza2.sql
-- Faza 2 / Etapa Casinos: extend the import RPC column whitelists so the 4 new
-- casinos columns (0024) are writable via CSV import. This RE-CREATES import_apply_row
-- (0022) and import_create_row (0023) via `create or replace` — it does NOT modify the
-- prior migration files. Only the `casinos` allowed-array changes; every other table's
-- whitelist, the junction authorization, SECURITY INVOKER, RLS reliance, and the
-- grant/revoke model are reproduced IDENTICALLY (mirrors src/lib/io/apply-row.ts).

-- ─────────────────────────────────────────────────────────────────────────────
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
  if p_table = 'casinos' then
    allowed := array['slug','offer_url','name','year_launched','logo_url','rating','editor_score','license',
      'license_verified_at','license_source','payout_speed','withdrawal_time','verified_at','verification_source',
      'min_deposit','kyc','support','mobile','intro','editor_review','pros','cons'];
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

  if p_patch is not null and p_patch <> '{}'::jsonb then
    for k in select jsonb_object_keys(p_patch) loop
      if not (k = any(allowed)) then
        raise exception 'import_apply_row: column % not allowed for %', k, p_table using errcode = '42501';
      end if;
      set_clause := set_clause || format('%I = m.%I,', k, k);
    end loop;
    set_clause := left(set_clause, length(set_clause) - 1);
    execute format(
      'update public.%I t set %s from (select (jsonb_populate_record(null::public.%I, $2)).*) m where t.id = $1',
      p_table, set_clause, p_table
    ) using p_id, p_patch;
  else
    execute format('update public.%I set slug = slug where id = $1', p_table) using p_id;
  end if;

  get diagnostics n_rows = row_count;
  if n_rows = 0 then
    raise exception 'import_apply_row: row % in % not found or not updatable (RLS)', p_id, p_table
      using errcode = 'P0002';
  end if;

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

revoke all on function public.import_apply_row(text, uuid, jsonb, jsonb) from public;
grant execute on function public.import_apply_row(text, uuid, jsonb, jsonb) to authenticated;
revoke execute on function public.import_apply_row(text, uuid, jsonb, jsonb) from anon;

-- ─────────────────────────────────────────────────────────────────────────────
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
  cols text := 'status';
  vals text := quote_literal('draft');
  j jsonb;
  new_id uuid;
begin
  if p_table = 'casinos' then
    allowed := array['slug','offer_url','name','year_launched','logo_url','rating','editor_score','license',
      'license_verified_at','license_source','payout_speed','withdrawal_time','verified_at','verification_source',
      'min_deposit','kyc','support','mobile','intro','editor_review','pros','cons'];
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

revoke all on function public.import_create_row(text, jsonb, jsonb) from public;
grant execute on function public.import_create_row(text, jsonb, jsonb) to authenticated;
revoke execute on function public.import_create_row(text, jsonb, jsonb) from anon;
