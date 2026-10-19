-- 0020_games_rtp_precision.sql
-- Widen games.rtp from numeric(4,1) to numeric(5,2) so official RTP values are
-- stored at two decimals EXACTLY (e.g. 96.48, 96.71, 96.09) with no rounding.
--
-- Purely a precision widening:
--   * The existing CHECK (rtp >= 0 and rtp <= 100) is preserved and re-validated
--     (all current + future values fit; range unchanged).
--   * The index idx_games_rtp (rtp desc) is rebuilt automatically by Postgres.
--   * games is empty in prod, so no existing data is rewritten.
-- numeric(5,2) range is -999.99..999.99 (scale 2); RTP stays within 0..100.

alter table public.games alter column rtp type numeric(5,2);
