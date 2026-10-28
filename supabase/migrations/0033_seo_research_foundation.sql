-- 0033: SEO Research foundation (FAZA 5.1B). Additive only — new tables, no change to
-- existing CMS tables or data. Admin-only via is_admin() (RLS is the source of truth);
-- NO public/anon access to SEO research data. Idempotent — safe to re-run.
--
-- Scope: the data foundation for keyword research (projects → imports → keywords →
-- clusters → briefs). No AI, no SERP, no CSV import logic here — those are later phases.
--
-- Apply in the Supabase SQL editor (DEV first, then PROD) BEFORE deploying the code that
-- reads these tables, otherwise /admin/seo-research would error on missing tables.

-- ── 1. seo_projects ─────────────────────────────────────────────────────────
create table if not exists public.seo_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_country text not null default 'ro',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── 2. seo_imports ──────────────────────────────────────────────────────────
create table if not exists public.seo_imports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  source text not null default 'ahrefs' check (source in ('ahrefs', 'manual', 'other')),
  filename text,
  row_count integer not null default 0,
  content_hash text,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now()
);
create index if not exists idx_seo_imports_project on public.seo_imports (project_id);

-- ── 3. seo_clusters (created before seo_keywords for the FK) ─────────────────
create table if not exists public.seo_clusters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  name text not null,
  intent text,
  primary_keyword text,
  created_at timestamptz not null default now()
);
create index if not exists idx_seo_clusters_project on public.seo_clusters (project_id);

-- ── 4. seo_keywords ─────────────────────────────────────────────────────────
-- keyword_normalized is for DEDUPLICATION ONLY (lowercase/trim/collapse/strip RO
-- diacritics); it is NOT a semantic signal and must not drive clustering.
create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  import_id uuid references public.seo_imports(id) on delete set null,
  keyword text not null,
  keyword_normalized text not null,
  country text not null default 'ro',
  volume integer,
  difficulty integer,
  traffic_potential integer,
  intent text,
  cpc numeric(10, 2),
  parent_topic text,
  cluster_id uuid references public.seo_clusters(id) on delete set null,
  mapped_url text,
  mapping_status text not null default 'none' check (mapping_status in ('none', 'suggested', 'confirmed')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'targeted', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_seo_keywords_dedup unique (project_id, keyword_normalized, country)
);
create index if not exists idx_seo_keywords_project on public.seo_keywords (project_id);
create index if not exists idx_seo_keywords_cluster on public.seo_keywords (cluster_id);
create index if not exists idx_seo_keywords_status  on public.seo_keywords (project_id, status);

-- ── 5. seo_briefs ───────────────────────────────────────────────────────────
create table if not exists public.seo_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  cluster_id uuid references public.seo_clusters(id) on delete set null,
  target_url text,
  title text,
  primary_keyword text,
  secondary_keywords jsonb not null default '[]'::jsonb,
  intent text,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'approved', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_seo_briefs_project on public.seo_briefs (project_id);
create index if not exists idx_seo_briefs_cluster on public.seo_briefs (cluster_id);

-- ── updated_at triggers (reuse existing set_updated_at) ─────────────────────
drop trigger if exists trg_seo_keywords_updated_at on public.seo_keywords;
create trigger trg_seo_keywords_updated_at before update on public.seo_keywords
  for each row execute function public.set_updated_at();
drop trigger if exists trg_seo_briefs_updated_at on public.seo_briefs;
create trigger trg_seo_briefs_updated_at before update on public.seo_briefs
  for each row execute function public.set_updated_at();

-- ── RLS: admin-only, no anon access ─────────────────────────────────────────
-- Enable RLS + a single admin-all policy per table; grant CRUD to authenticated
-- (RLS still gates by is_admin()); revoke everything from anon (Supabase default
-- privileges would otherwise grant write to anon on new tables — see 0030).
do $$
declare t text;
begin
  foreach t in array array['seo_projects','seo_imports','seo_keywords','seo_clusters','seo_briefs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s admin all" on public.%I', t, t);
    execute format(
      'create policy "%s admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
