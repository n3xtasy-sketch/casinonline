-- 0032: editorial authorship — assign an author + verifier + editorial verification
-- date to content (casino reviews, bonuses, guides).
--
-- Author identity lives in CODE (src/lib/authors.ts) — the single registry that also
-- powers the public /autori profiles. We store only the stable author SLUG here, so an
-- author is not duplicated across a second DB table. Validation (known slug, author !=
-- verifier, verified_at requires a verifier) is enforced in the Admin server actions.
--
-- All columns are NULLABLE. NO backfill, NO auto-assignment to existing content, NO
-- verification dates for existing rows, NO deletion of data. Idempotent — safe to re-run.
--
-- Grants: unchanged. anon already has SELECT on these tables (new columns inherit it);
-- authenticated already has UPDATE (write RLS gated by is_admin()). No new policy needed.

-- NOTE: `editorial_verified_at` is intentionally NOT reusing the existing
-- `verified_at` columns on casinos/bonuses (those are Faza 2 offer/operator
-- verification dates) — the editorial verification is a distinct concept.

alter table public.casinos add column if not exists author_slug            text;
alter table public.casinos add column if not exists verifier_slug          text;
alter table public.casinos add column if not exists editorial_verified_at  timestamptz;

alter table public.bonuses add column if not exists author_slug            text;
alter table public.bonuses add column if not exists verifier_slug          text;
alter table public.bonuses add column if not exists editorial_verified_at  timestamptz;

alter table public.guides  add column if not exists author_slug            text;
alter table public.guides  add column if not exists verifier_slug          text;
alter table public.guides  add column if not exists editorial_verified_at  timestamptz;
