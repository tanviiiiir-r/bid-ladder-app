-- Wipe Bid Ladder preview seed only. Never run against real maker data.
-- Matches emails seed+…@bid-ladder.dev and listing descriptions starting with [SEED].

DELETE FROM public.daily_rank_snapshots
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');

DELETE FROM public.today_rankings
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');

DELETE FROM public.rankings
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');

DELETE FROM public.daily_allocations
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');

DELETE FROM public.credit_ledger
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'seed+%@bid-ladder.dev')
   OR reason = 'preview seed';

DELETE FROM public.wallets
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'seed+%@bid-ladder.dev');

DELETE FROM public.listings
WHERE description LIKE '[SEED]%';

DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'seed+%@bid-ladder.dev');

DELETE FROM auth.users
WHERE email LIKE 'seed+%@bid-ladder.dev';

SELECT public.recompute_rankings();
