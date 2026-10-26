-- 0026_bonuses_faza2_fields.sql
-- Faza 2 / Etapa Bonusuri: 11 additive, nullable columns on public.bonuses.
-- Purely additive — NO default, NO backfill, NO change to existing columns/data.
-- NULL = necompletat; [] (doar pentru jsonb) = listă explicit goală. RLS inherited.
--
--   amount               text    – valoarea bonusului (editorial, ex. "100% până la 500 RON")
--   spin_value           numeric – valoarea unei rotiri (RON), >= 0
--   max_win              numeric – câștig maxim (RON), >= 0
--   eligible_slots       jsonb   – listă sloturi eligibile (NULL ≠ [])
--   kyc_required         boolean – KYC obligatoriu (NULL = necunoscut, false ≠ NULL)
--   reward_stages        jsonb   – tranșe (NULL ≠ [])
--   terms_url            text    – URL T&C (validat ca URL în app)
--   verified_at          date    – data verificării promoției
--   expires_at           date    – data expirării ofertei
--   wagering_multiplier  numeric – multiplicator rulaj (0 = fără rulaj, NULL = necunoscut), >= 0
--   wagering_basis       text    – baza de calcul a rulajului

alter table public.bonuses
  add column if not exists amount text,
  add column if not exists spin_value numeric,
  add column if not exists max_win numeric,
  add column if not exists eligible_slots jsonb,
  add column if not exists kyc_required boolean,
  add column if not exists reward_stages jsonb,
  add column if not exists terms_url text,
  add column if not exists verified_at date,
  add column if not exists expires_at date,
  add column if not exists wagering_multiplier numeric,
  add column if not exists wagering_basis text;

-- Non-negativity CHECKs on the NEW numeric columns only (existing free_spins untouched).
-- Guarded so the migration is idempotent.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bonuses_spin_value_nonneg') then
    alter table public.bonuses add constraint bonuses_spin_value_nonneg
      check (spin_value is null or spin_value >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bonuses_max_win_nonneg') then
    alter table public.bonuses add constraint bonuses_max_win_nonneg
      check (max_win is null or max_win >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bonuses_wagering_multiplier_nonneg') then
    alter table public.bonuses add constraint bonuses_wagering_multiplier_nonneg
      check (wagering_multiplier is null or wagering_multiplier >= 0);
  end if;
end $$;
