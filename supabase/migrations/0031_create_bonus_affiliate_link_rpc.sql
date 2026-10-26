-- 0031: creare + asociere ATOMICĂ a unui affiliate_link pentru un bonus (Admin, opțiunea C).
--
-- De ce un RPC: clientul Supabase/PostgREST nu poate face o tranzacție pe mai multe
-- tabele. Legarea INSERT link + asignare bonus într-O SINGURĂ funcție plpgsql le pune
-- în aceeași tranzacție → dacă asignarea eșuează, se anulează și INSERT-ul linkului
-- (fără link orfan). Fluxul apelantului: la CREATE salvează întâi bonusul cu
-- affiliate_link_id NULL, apoi apelează acest RPC.
--
-- SECURITY INVOKER → RLS existent (is_admin()) rămâne gardianul pe affiliate_links și
-- bonuses. În plus, verificare explicită is_admin() în corpul funcției (defense in depth).
-- EXECUTE revocat de la public + anon; permis doar authenticated.
--
-- Idempotent (create or replace). Nu modifică rutele/resolverele/politicile.

create or replace function public.create_bonus_affiliate_link(
  p_bonus_id  uuid,
  p_casino_id uuid,
  p_url       text,
  p_placement text default 'bonus_claim',
  p_campaign  text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_link_id uuid;
begin
  -- #2 gardă admin explicită în RPC (peste RLS)
  if not public.is_admin() then
    raise exception 'acces interzis' using errcode = '42501';
  end if;

  -- #4 validări: placement controlat + HTTPS (oglindesc CHECK-urile din 0013)
  if p_placement not in ('review_cta', 'bonus_claim', 'listing_card') then
    raise exception 'placement invalid: %', p_placement using errcode = '22023';
  end if;
  if p_url is null or p_url !~ '^https://' then
    raise exception 'url trebuie să înceapă cu https://' using errcode = '22023';
  end if;

  -- #5 reutilizează DOAR un link cu semnificație identică: același cazino + URL +
  -- placement + campanie (activ). Un link cu altă campanie/placement NU se reutilizează.
  select id into v_link_id
  from public.affiliate_links
  where casino_id = p_casino_id
    and url = p_url
    and placement = p_placement
    and campaign is not distinct from p_campaign
    and is_active
  limit 1;

  if v_link_id is null then
    -- #6 concurență: indexul parțial-unic 0013 (casino, placement, coalesce(campaign,''))
    -- pe is_active serializează inserturile pentru același slot. Dacă o cerere paralelă
    -- a creat deja linkul, prindem unique_violation și reutilizăm — dar numai dacă are
    -- EXACT același URL (altfel e un conflict real de slot ocupat de alt URL).
    begin
      insert into public.affiliate_links (casino_id, placement, url, campaign, is_active)
      values (p_casino_id, p_placement, p_url, p_campaign, true)
      returning id into v_link_id;
    exception when unique_violation then
      select id into v_link_id
      from public.affiliate_links
      where casino_id = p_casino_id
        and placement = p_placement
        and campaign is not distinct from p_campaign
        and is_active
      limit 1;
      if v_link_id is null then
        raise; -- conflict de alt tip; propagă (rollback complet)
      end if;
      if not exists (select 1 from public.affiliate_links where id = v_link_id and url = p_url) then
        raise exception
          'există deja un link activ cu alt URL pentru acest cazino + placement + campanie'
          using errcode = '23505';
      end if;
    end;
  end if;

  -- #4/#7 asignare cu predicat same-casino (defense in depth peste FK compozit 0028).
  -- Dacă eșuează (bonus inexistent / alt cazino), excepția propagă în afara funcției →
  -- întreaga tranzacție (inclusiv INSERT-ul linkului de mai sus) face ROLLBACK.
  update public.bonuses
    set affiliate_link_id = v_link_id
  where id = p_bonus_id and casino_id = p_casino_id;
  if not found then
    raise exception 'bonus inexistent sau aparține altui cazino' using errcode = 'P0002';
  end if;

  return v_link_id;
end;
$$;

-- #3 doar authenticated poate executa; public + anon revocat (consecvent cu 0030).
revoke all on function public.create_bonus_affiliate_link(uuid, uuid, text, text, text) from public;
grant execute on function public.create_bonus_affiliate_link(uuid, uuid, text, text, text) to authenticated;
revoke execute on function public.create_bonus_affiliate_link(uuid, uuid, text, text, text) from anon;
