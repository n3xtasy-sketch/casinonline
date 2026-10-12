-- 0017: append-only activity log. Admin-only read; admin-only insert (as self);
-- NO update/delete (append-only at the privilege level). Reuses is_admin(). No service_role.
-- Idempotent — safe to re-run. Apply in the Supabase SQL editor.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  label text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_created on public.activity_log (created_at desc);
create index if not exists idx_activity_entity  on public.activity_log (entity_type, entity_id);
create index if not exists idx_activity_actor   on public.activity_log (actor_user_id);
create index if not exists idx_activity_action  on public.activity_log (action);

alter table public.activity_log enable row level security;

drop policy if exists "activity admin read" on public.activity_log;
create policy "activity admin read" on public.activity_log
  for select to authenticated using (public.is_admin());

drop policy if exists "activity admin insert" on public.activity_log;
create policy "activity admin insert" on public.activity_log
  for insert to authenticated
  with check (public.is_admin() and actor_user_id = auth.uid());

-- Append-only: grant ONLY select + insert (no update/delete) to authenticated.
grant select, insert on public.activity_log to authenticated;
