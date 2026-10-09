-- ============================================================================
-- CasinOnline.ro — Initial schema (editorial / commercial content + relations)
-- Scope: content entities, taxonomies, M2M relations, affiliate links.
-- Excluded (auth phase): profiles, favorites, ratings.
-- NOT executed automatically. Review before running.
-- ============================================================================

-- ----- Extensions -----------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ----- Enums ----------------------------------------------------------------
create type public.game_volatility as enum ('Mică', 'Medie', 'Mare');

-- ----- updated_at trigger function ------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. TAXONOMY / LOOKUP TABLES
-- ============================================================================
create table public.bonus_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.game_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.payment_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.guide_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. CORE CONTENT TABLES
-- ============================================================================
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  game_count integer not null default 0,
  category text,
  founded smallint,
  country text,
  specialty text,
  rtp_range text,
  intro text,
  faq jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  provider_id uuid references public.providers(id) on delete set null,
  category_id uuid references public.game_categories(id) on delete set null,
  thumbnail_url text,
  rtp numeric(4,1) check (rtp >= 0 and rtp <= 100),
  volatility public.game_volatility,
  intro text,
  max_win text,
  release_year smallint,
  reels text,
  paylines text,
  bet_range text,
  mechanics text,
  bonus_features jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.casinos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  rating numeric(2,1) check (rating >= 0 and rating <= 5),
  editor_score numeric(3,1) check (editor_score >= 0 and editor_score <= 10),
  license text,
  payout_speed text,
  withdrawal_time text,
  verified_at date,
  min_deposit text,
  kyc text,
  support text,
  mobile text,
  offer_url text,
  intro text,
  editor_review text,
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bonuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  casino_id uuid not null references public.casinos(id) on delete cascade,
  bonus_type_id uuid references public.bonus_types(id) on delete set null,
  offer text not null,
  free_spins integer,
  wagering text,
  code text,
  claim_url text,
  intro text,
  min_deposit text,
  validity text,
  terms jsonb not null default '[]'::jsonb,
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  how_to_claim jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  payment_type_id uuid references public.payment_types(id) on delete set null,
  intro text,
  deposits text,
  withdrawals text,
  deposit_speed text,
  withdrawal_speed text,
  fees text,
  min_limit text,
  max_limit text,
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category_id uuid references public.guide_categories(id) on delete set null,
  excerpt text,
  image_url text,
  author text,
  intro text,
  reading_time text,
  sections jsonb not null default '[]'::jsonb,
  related_links jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3. JOIN TABLES (many-to-many)
-- Note: casino <-> provider is NOT a physical table; derived via the
--       casino_providers view below (single source of truth = casino_games).
-- ============================================================================
create table public.casino_payment_methods (
  casino_id uuid not null references public.casinos(id) on delete cascade,
  payment_method_id uuid not null references public.payment_methods(id) on delete cascade,
  primary key (casino_id, payment_method_id)
);

create table public.casino_games (
  casino_id uuid not null references public.casinos(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  primary key (casino_id, game_id)
);

create table public.casino_tags (
  casino_id uuid not null references public.casinos(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (casino_id, tag_id)
);

-- ============================================================================
-- 4. AFFILIATE LINKS (centralized URL / campaign management)
-- ============================================================================
create table public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  casino_id uuid not null references public.casinos(id) on delete cascade,
  placement text not null,                 -- e.g. 'review_cta', 'bonus_claim', 'listing_card'
  url text not null,
  campaign text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 5. DERIVED VIEW — casino <-> provider
-- Respects underlying RLS (security_invoker). Single source of truth.
-- ============================================================================
create view public.casino_providers
with (security_invoker = true)
as
select distinct cg.casino_id, g.provider_id
from public.casino_games cg
join public.games g on g.id = cg.game_id
where g.provider_id is not null;

-- ============================================================================
-- 6. INDEXES (slug uniques are auto-indexed)
-- ============================================================================
create index idx_games_provider_id         on public.games (provider_id);
create index idx_games_category_id          on public.games (category_id);
create index idx_games_volatility           on public.games (volatility);
create index idx_bonuses_casino_id          on public.bonuses (casino_id);
create index idx_bonuses_bonus_type_id      on public.bonuses (bonus_type_id);
create index idx_payment_methods_type_id    on public.payment_methods (payment_type_id);
create index idx_guides_category_id         on public.guides (category_id);
create index idx_guides_published_at        on public.guides (published_at desc);
create index idx_casinos_rating             on public.casinos (rating desc);
create index idx_casinos_editor_score       on public.casinos (editor_score desc);

-- reverse lookups on join tables
create index idx_casino_games_game_id       on public.casino_games (game_id);
create index idx_casino_pm_pm_id            on public.casino_payment_methods (payment_method_id);
create index idx_casino_tags_tag_id         on public.casino_tags (tag_id);

-- affiliate links
create index idx_affiliate_links_casino_id  on public.affiliate_links (casino_id);
create index idx_affiliate_links_active      on public.affiliate_links (casino_id) where is_active;

-- ============================================================================
-- 7. updated_at TRIGGERS
-- ============================================================================
create trigger trg_providers_updated_at       before update on public.providers       for each row execute function public.set_updated_at();
create trigger trg_games_updated_at            before update on public.games            for each row execute function public.set_updated_at();
create trigger trg_casinos_updated_at          before update on public.casinos          for each row execute function public.set_updated_at();
create trigger trg_bonuses_updated_at          before update on public.bonuses          for each row execute function public.set_updated_at();
create trigger trg_payment_methods_updated_at  before update on public.payment_methods  for each row execute function public.set_updated_at();
create trigger trg_guides_updated_at           before update on public.guides           for each row execute function public.set_updated_at();
create trigger trg_affiliate_links_updated_at  before update on public.affiliate_links  for each row execute function public.set_updated_at();

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- Content is public (read-only for anon/authenticated). Writes go through the
-- service_role key (bypasses RLS) until the admin/auth phase adds an is_admin
-- policy. affiliate_links exposes only active rows publicly.
-- ============================================================================
alter table public.bonus_types             enable row level security;
alter table public.game_categories         enable row level security;
alter table public.payment_types           enable row level security;
alter table public.guide_categories        enable row level security;
alter table public.tags                    enable row level security;
alter table public.providers               enable row level security;
alter table public.games                   enable row level security;
alter table public.casinos                 enable row level security;
alter table public.bonuses                 enable row level security;
alter table public.payment_methods         enable row level security;
alter table public.guides                  enable row level security;
alter table public.casino_payment_methods  enable row level security;
alter table public.casino_games            enable row level security;
alter table public.casino_tags             enable row level security;
alter table public.affiliate_links         enable row level security;

-- Public read policies (SELECT only)
create policy "bonus_types read"            on public.bonus_types            for select using (true);
create policy "game_categories read"        on public.game_categories        for select using (true);
create policy "payment_types read"          on public.payment_types          for select using (true);
create policy "guide_categories read"       on public.guide_categories       for select using (true);
create policy "tags read"                   on public.tags                   for select using (true);
create policy "providers read"              on public.providers              for select using (true);
create policy "games read"                  on public.games                  for select using (true);
create policy "casinos read"                on public.casinos                for select using (true);
create policy "bonuses read"                on public.bonuses                for select using (true);
create policy "payment_methods read"        on public.payment_methods        for select using (true);
create policy "guides read"                 on public.guides                 for select using (true);
create policy "casino_payment_methods read" on public.casino_payment_methods for select using (true);
create policy "casino_games read"           on public.casino_games           for select using (true);
create policy "casino_tags read"            on public.casino_tags            for select using (true);
create policy "affiliate_links read active" on public.affiliate_links        for select using (is_active);
-- No INSERT/UPDATE/DELETE policies: writes denied for anon/authenticated,
-- performed via service_role (admin) until the auth phase.

-- ============================================================================
-- 9. GRANTS (RLS gates rows; grants gate operations)
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant select on public.casino_providers to anon, authenticated;
