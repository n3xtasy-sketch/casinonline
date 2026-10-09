-- 0003: resolve affiliate URLs through a SECURITY DEFINER function so the anon
-- role can look up a casino's operator URL WITHOUT being able to read the
-- affiliate_links table directly over REST. No service_role is involved.
-- Apply in the Supabase SQL editor (DDL can't run through the anon/REST client).

create or replace function public.get_affiliate_url(p_slug text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select al.url
  from public.affiliate_links al
  join public.casinos c on c.id = al.casino_id
  where c.slug = p_slug and al.is_active
  order by case when al.placement = 'review_cta' then 0 else 1 end
  limit 1
$$;

-- Only the narrow function is callable by anon; the table itself is not readable.
revoke all on function public.get_affiliate_url(text) from public;
grant execute on function public.get_affiliate_url(text) to anon, authenticated;

-- Remove direct anon read access to the table (the app now uses the function).
drop policy if exists "affiliate_links read active" on public.affiliate_links;
revoke select on public.affiliate_links from anon;
