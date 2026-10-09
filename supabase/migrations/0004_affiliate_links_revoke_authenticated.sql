-- 0004: also revoke direct SELECT on affiliate_links from the authenticated role
-- (0003 removed it for anon). Access stays only through get_affiliate_url().
-- Apply in the Supabase SQL editor.

revoke select on public.affiliate_links from authenticated;
