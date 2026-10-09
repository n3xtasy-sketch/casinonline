-- 0002: indexes backing the ORDER BY columns actually used by the query layer.
-- casinos(rating desc) already exists from 0001 (idx_casinos_rating).
-- Apply in the Supabase SQL editor (DDL can't run through the anon/REST client).

create index if not exists idx_providers_game_count on public.providers (game_count desc);
create index if not exists idx_games_name           on public.games (name);
create index if not exists idx_games_rtp             on public.games (rtp desc) where rtp is not null;
create index if not exists idx_payment_methods_name  on public.payment_methods (name);
create index if not exists idx_bonuses_created_at     on public.bonuses (created_at);
create index if not exists idx_guides_created_at      on public.guides (created_at);
