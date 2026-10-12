-- 0014: Media Library storage bucket + admin-only write policies.
-- Public READ via the public bucket URL; INSERT/UPDATE/DELETE/LIST only for admins.
-- No service_role anywhere. Idempotent — safe to re-run. Apply in the Supabase SQL editor.

-- Public bucket (objects served at /storage/v1/object/public/media/...).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- storage.objects already has RLS enabled by Supabase. Admin-only writes + listing.
drop policy if exists "media admin list"   on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;

create policy "media admin list" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.is_admin());

create policy "media admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy "media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy "media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
