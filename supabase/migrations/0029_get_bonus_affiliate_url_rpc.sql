-- 0029_get_bonus_affiliate_url_rpc.sql
-- Faza 3 / Etapa 1: resolve /go/<casino-slug>/<bonus-slug> to an operator URL.
-- The bonus MUST exist under that casino; otherwise return NULL so the route falls back
-- same-origin to the casino review — a nonexistent/mismatched bonus must NOT inherit the
-- casino's main link. Priority for an existing bonus: (1) bonus-specific active link →
-- (2) casino default (reuses get_affiliate_url, 0003) → (3) NULL.
--
-- SECURITY DEFINER like get_affiliate_url (0003): anon can resolve the URL WITHOUT reading
-- affiliate_links (SELECT stays revoked for anon+authenticated). is_active is enforced; the
-- bonus link is same-casino by the 0028 composite FK. Returns only a stored URL — no way to
-- inject an external destination. get_affiliate_url(<casino-slug>) is unchanged (0003).

create or replace function public.get_bonus_affiliate_url(p_casino_slug text, p_bonus_slug text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when not exists (
      select 1
      from public.bonuses b
      join public.casinos c on c.id = b.casino_id
      where c.slug = p_casino_slug and b.slug = p_bonus_slug
    ) then null
    else coalesce(
      (
        select al.url
        from public.bonuses b
        join public.casinos c on c.id = b.casino_id and c.slug = p_casino_slug
        join public.affiliate_links al on al.id = b.affiliate_link_id and al.is_active
        where b.slug = p_bonus_slug
        limit 1
      ),
      public.get_affiliate_url(p_casino_slug)
    )
  end
$$;

revoke all on function public.get_bonus_affiliate_url(text, text) from public;
grant execute on function public.get_bonus_affiliate_url(text, text) to anon, authenticated;
