-- 0019_game_demo_url.sql
-- On-site free-play (demo) support for games.
--
-- Adds an OPTIONAL demo_url to games. Nullable + additive: existing rows are
-- untouched (demo_url defaults to NULL), so this is safe on populated data.
--
-- Deliberately NOT part of the CSV import descriptor (src/lib/io/entities.ts):
-- demo URLs are curated per game via Admin → Edit later, WITHOUT reimporting
-- the games. The app renders the demo iframe only for URLs that are https AND
-- on the approved host allowlist (src/lib/demo.ts); the column itself stays a
-- plain nullable text so curation/validation lives in the application layer.

alter table public.games add column if not exists demo_url text;

comment on column public.games.demo_url is
  'Optional https URL of the provider free-play/demo build, framed on the game page. Curated via Admin (not CSV import); validated against the app allowlist.';
