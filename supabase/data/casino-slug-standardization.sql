-- casino-slug-standardization.sql  (DATA change, NOT a schema migration)
--
-- Renames 8 casino review slugs to the `-casino` convention and keeps the DERIVED internal
-- affiliate path (/go/<slug>) in sync. MANUAL, approval-gated. Run in the Supabase SQL Editor
-- (DEV first, then PROD with approval). Paired with the 308 redirects in next.config.ts
-- (src/lib/seo/casino-redirects.ts) — deploy those so the old URLs keep resolving.
--
-- Scope / safety:
--   * Touches ONLY casinos.slug and (conditionally) casinos.offer_url. No commercial data
--     (bonuses, ratings, licenses) is modified.
--   * offer_url is rewritten ONLY when it is the derived internal form '/go/<old_slug>'. Any
--     custom/external offer_url is PRESERVED (left untouched).
--   * 888casino, vlad-cazino and archived/test operators are intentionally excluded.
--   * No FK references casinos.slug (all relations use casino_id), so nothing cascades.
--   * Trigger casino_slug_guard rejects a slug reserved by a seo_categories 'casino' row — verified
--     0 such rows at prep time; the new slugs do not exist yet (verified).

-- ── PRE-CHECK (read-only; run first, expect the noted results) ───────────────
--   expect 8 rows, all currently bare slugs, offer_url = '/go/<slug>':
-- select slug, offer_url, status from public.casinos
--   where slug in ('betano','maxbet','mr-bit','netbet','superbet','unibet','winmasters','winner')
--   order by slug;
--   expect 0 rows (no collision with the target slugs):
-- select slug from public.casinos
--   where slug in ('betano-casino','maxbet-casino','mr-bit-casino','netbet-casino','superbet-casino','unibet-casino','winmasters-casino','winner-casino');
--   expect 0 rows (slug-guard would otherwise block):
-- select slug from public.seo_categories where namespace = 'casino';

-- ── APPLY (single atomic statement) ──────────────────────────────────────────
update public.casinos c
set
  slug = v.new_slug,
  -- keep the internal affiliate path in sync; preserve any custom/external offer_url
  offer_url = case when c.offer_url = '/go/' || v.old_slug then '/go/' || v.new_slug else c.offer_url end
from (values
  ('betano',     'betano-casino'),
  ('maxbet',     'maxbet-casino'),
  ('mr-bit',     'mr-bit-casino'),
  ('netbet',     'netbet-casino'),
  ('superbet',   'superbet-casino'),
  ('unibet',     'unibet-casino'),
  ('winmasters', 'winmasters-casino'),
  ('winner',     'winner-casino')
) as v(old_slug, new_slug)
where c.slug = v.old_slug;
--   expect: UPDATE 8

-- ── POST-CHECK (read-only; run after) ────────────────────────────────────────
--   expect the 8 new slugs present, offer_url synced where it was internal:
-- select slug, offer_url, status from public.casinos
--   where slug in ('betano-casino','maxbet-casino','mr-bit-casino','netbet-casino','superbet-casino','unibet-casino','winmasters-casino','winner-casino')
--   order by slug;
--   expect 0 rows (no bare slug remains):
-- select slug from public.casinos
--   where slug in ('betano','maxbet','mr-bit','netbet','superbet','unibet','winmasters','winner');

-- ── ROLLBACK (reverse the rename; run only to undo) ──────────────────────────
-- update public.casinos c
-- set
--   slug = v.old_slug,
--   offer_url = case when c.offer_url = '/go/' || v.new_slug then '/go/' || v.old_slug else c.offer_url end
-- from (values
--   ('betano',     'betano-casino'),
--   ('maxbet',     'maxbet-casino'),
--   ('mr-bit',     'mr-bit-casino'),
--   ('netbet',     'netbet-casino'),
--   ('superbet',   'superbet-casino'),
--   ('unibet',     'unibet-casino'),
--   ('winmasters', 'winmasters-casino'),
--   ('winner',     'winner-casino')
-- ) as v(old_slug, new_slug)
-- where c.slug = v.new_slug;
