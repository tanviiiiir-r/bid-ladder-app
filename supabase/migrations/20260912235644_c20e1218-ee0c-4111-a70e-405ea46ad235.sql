-- lovable-cron-fallback-reviewed: 288 runs/day; the ranking score includes a time-decaying freshness term, so ranks must be recomputed on a clock. Public board reads never trigger recompute.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recompute-rankings') THEN
    PERFORM cron.unschedule('recompute-rankings');
  END IF;
END $$;

SELECT cron.schedule(
  'recompute-rankings',
  '*/5 * * * *',
  $$SELECT public.recompute_rankings();$$
);