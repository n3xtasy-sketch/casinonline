-- 0034: seo_imports.status — distinguish processing / completed / partial / failed, so a
-- partial import (batch error OR Vercel timeout) is never shown as complete. Additive,
-- idempotent. No change to existing data. Admin-only RLS inherited from 0033.
--
-- Default 'completed' backfills any pre-existing rows (historical imports presumed done);
-- the importer explicitly writes 'processing' at start, then 'completed'/'partial'/'failed'.
-- A row stuck at 'processing' = the request died (e.g. timeout) before finishing.
--
-- Apply in SQL editor, DEV first, BEFORE deploying the code that writes `status`.

alter table public.seo_imports add column if not exists status text not null default 'completed';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'seo_imports_status_check') then
    alter table public.seo_imports
      add constraint seo_imports_status_check
      check (status in ('processing', 'completed', 'partial', 'failed'));
  end if;
end $$;
