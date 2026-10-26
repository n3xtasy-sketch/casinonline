-- 0030: affiliate_links — least privilege pentru rolul anon.
--
-- CAUZA: la crearea tabelei (0001) Supabase aplică default privileges care acordă
-- anon/authenticated INSERT/UPDATE/DELETE pe tabelele din schema public. Migrările
-- 0003/0004 au revocat doar SELECT; INSERT/UPDATE/DELETE pentru anon au rămas
-- acordate (neatinse de nicio migrare). RLS (0001 enable + 0006 "affiliate_links
-- admin all" to authenticated) le neutralizează azi, dar sunt granturi reziduale
-- care ar deveni active dacă RLS ar fi vreodată dezactivat → încălcare least-privilege.
--
-- anon NU are nevoie de niciun acces direct: redirecturile publice folosesc exclusiv
-- funcțiile SECURITY DEFINER get_affiliate_url / get_bonus_affiliate_url.
-- authenticated PĂSTREAZĂ select/insert/update (formularul Admin, gated de RLS
-- is_admin()); delete e deja revocat (0013). Nu atingem authenticated aici.
--
-- Idempotent. Doar granturi — nicio modificare de date, schemă sau politici.

revoke all on public.affiliate_links from anon;

-- (opțional, igienă) confirmă că execute pe resolvere rămâne pentru anon — neatins:
--   get_affiliate_url(text), get_bonus_affiliate_url(text, text) → execute to anon.
