-- Manual / staging checks for Layer 1 ranking.
-- Mirrors src/lib/ranking.ts and src/lib/allocation-rules.test.ts.
-- Run against a scratch schema, not production.
--
-- Cases:
-- 1. $0 approved listings are absent from public.rankings after recompute
-- 2. equal allocation_cents: earlier allocation_set_at is rank 1
-- 3. set_allocation below 1000 cents (except 0) fails
-- 4. set_allocation without enough wallet.available_cents fails
-- 5. taking #1 with only +100 cents fails; +500 succeeds
-- 6. increase writes credit_ledger type=allocation (negative); decrease writes allocation_release
-- 7. Today uses daily_allocations for the current UTC date only
-- 8. freeze_daily_board(yesterday) inserts daily_rank_snapshots and is idempotent
-- 9. admin_grant_credits with the same idempotency_key does not double-credit

SELECT public.recompute_rankings();
SELECT public.freeze_daily_board();
