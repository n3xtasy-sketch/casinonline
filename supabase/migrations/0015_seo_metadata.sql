-- 0015: centralized SEO overrides. Public read; admin-only write. No physical delete
-- (reset = null fields). Reuses is_admin() (0006) + set_updated_at() (0001). No service_role.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

create table if not exists public.seo_metadata (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in
    ('casino','game','provider','payment_method','bonus','guide')),
  entity_id uuid not null,
  meta_title text,
  meta_description text,
  canonical text,
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  og_title text,
  og_description text,
  og_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create index if not exists idx_seo_entity on public.seo_metadata (entity_type, entity_id);

alter table public.seo_metadata enable row level security;

drop policy if exists "seo read" on public.seo_metadata;
create policy "seo read" on public.seo_metadata for select using (true);

drop policy if exists "seo admin insert" on public.seo_metadata;
create policy "seo admin insert" on public.seo_metadata
  for insert to authenticated with check (public.is_admin());

drop policy if exists "seo admin update" on public.seo_metadata;
create policy "seo admin update" on public.seo_metadata
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select         on public.seo_metadata to anon, authenticated;
grant insert, update on public.seo_metadata to authenticated;

drop trigger if exists trg_seo_updated_at on public.seo_metadata;
create trigger trg_seo_updated_at before update on public.seo_metadata
  for each row execute function public.set_updated_at();
