-- 0013: integrity constraints for affiliate_links (controlled placement, https-only,
-- one active link per casino+placement+campaign). No new columns, no new policies
-- (0006 already gates admin insert/update; 0003/0012 own the get_affiliate_url RPC).
-- No physical delete — deactivate via is_active=false. Idempotent — safe to re-run.

alter table public.affiliate_links drop constraint if exists affiliate_links_placement_check;
alter table public.affiliate_links
  add constraint affiliate_links_placement_check
  check (placement in ('review_cta', 'bonus_claim', 'listing_card'));

alter table public.affiliate_links drop constraint if exists affiliate_links_url_https_check;
alter table public.affiliate_links
  add constraint affiliate_links_url_https_check
  check (url ~ '^https://');

-- One ACTIVE link per (casino, placement, campaign); NULL campaign = the single
-- "default" slot (what /go's review_cta uses). Multiple active campaigns per
-- placement stay allowed. Verified: existing data has no conflicts.
create unique index if not exists uq_affiliate_links_active
  on public.affiliate_links (casino_id, placement, coalesce(campaign, ''))
  where is_active;

-- No physical delete — deactivation is exclusively is_active=false.
revoke delete on public.affiliate_links from authenticated;
