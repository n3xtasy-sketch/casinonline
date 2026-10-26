-- 0028_bonuses_affiliate_link.sql
-- Faza 3 / Etapa 1: a bonus may point to ONE affiliate_link from its OWN casino's pool;
-- many bonuses can reuse the same link (no URL duplication). Additive, nullable, no backfill.
--
-- Same-casino rule enforced at DB level via a COMPOSITE foreign key (not just UI):
-- bonuses(affiliate_link_id, casino_id) → affiliate_links(id, casino_id). Because
-- affiliate_links.id is unique, a given affiliate_link_id maps to exactly one casino_id,
-- so the bonus's casino_id must equal the link's casino_id. MATCH SIMPLE (default): when
-- affiliate_link_id IS NULL the FK is not checked → "no specific link" stays allowed.
-- No ON DELETE action needed — affiliate_links are never physically deleted (DELETE revoked;
-- deactivation is is_active=false), and a referenced link can't be deleted (NO ACTION).

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'uq_affiliate_links_id_casino') then
    alter table public.affiliate_links add constraint uq_affiliate_links_id_casino unique (id, casino_id);
  end if;
end $$;

alter table public.bonuses add column if not exists affiliate_link_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bonuses_affiliate_link_same_casino_fk') then
    alter table public.bonuses
      add constraint bonuses_affiliate_link_same_casino_fk
      foreign key (affiliate_link_id, casino_id)
      references public.affiliate_links (id, casino_id);
  end if;
end $$;
