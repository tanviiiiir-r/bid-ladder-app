-- Layer 1: allocation determines rank.
-- Constants MUST match src/lib/ranking.ts v0.2:
--   min visible = 1000 cents
--   increment   = 100 cents
--   #1 premium  = 500 cents
--   Today/Daily = UTC calendar date

CREATE TYPE public.category_status AS ENUM ('active', 'hidden');
CREATE TYPE public.credit_ledger_type AS ENUM (
  'admin_grant',
  'allocation',
  'allocation_release',
  'topup',
  'points_conversion',
  'adjustment'
);

-- Categories: first-class Outbid taxonomy. Keep existing ids; remap slugs.
ALTER TABLE public.categories
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN status public.category_status NOT NULL DEFAULT 'active';

UPDATE public.categories
SET slug = 'agents',
    name = 'Agents',
    description = 'AI agents and autonomous products',
    sort_order = 5
WHERE slug = 'ai';

UPDATE public.categories
SET slug = 'business',
    name = 'Business',
    description = 'Business and SaaS products',
    sort_order = 10
WHERE slug = 'saas';

UPDATE public.categories
SET slug = 'developer',
    name = 'Developer',
    description = 'Developer tools and infrastructure',
    sort_order = 8
WHERE slug = 'tools';

INSERT INTO public.categories (slug, name, description, sort_order, status) VALUES
  ('leaderboards', 'Leaderboards', 'Leaderboard and ranking products', 1, 'active'),
  ('seo', 'SEO', 'Search and discoverability', 2, 'active'),
  ('marketing', 'Marketing', 'Marketing and growth tools', 3, 'active'),
  ('productivity', 'Productivity', 'Productivity and workflow', 4, 'active'),
  ('crypto', 'Crypto', 'Crypto and onchain products', 6, 'active'),
  ('other', 'Other', 'Everything else', 7, 'active'),
  ('health', 'Health', 'Health and wellness', 9, 'active'),
  ('games', 'Games', 'Games and entertainment', 11, 'active'),
  ('ecommerce', 'Ecommerce', 'Stores and commerce', 12, 'active'),
  ('travel', 'Travel', 'Travel and places', 13, 'active'),
  ('directories', 'Directories', 'Directories and catalogs', 14, 'active'),
  ('agencies', 'Agencies', 'Agencies and studios', 15, 'active'),
  ('ai-media', 'AI Media', 'AI media and generation', 16, 'active'),
  ('education', 'Education', 'Learning and education', 17, 'active'),
  ('social', 'Social', 'Social and community', 18, 'active'),
  ('people', 'People', 'People and personal brands', 19, 'active'),
  ('design', 'Design', 'Design tools and systems', 20, 'active'),
  ('hiring', 'Hiring', 'Hiring and talent', 21, 'active'),
  ('domains', 'Domains', 'Domains and naming', 22, 'active'),
  ('security', 'Security', 'Security and privacy', 23, 'active'),
  ('sales', 'Sales', 'Sales tools', 24, 'active'),
  ('news', 'News', 'News and publishing', 25, 'active'),
  ('real-estate', 'Real Estate', 'Real estate', 26, 'active'),
  ('writing', 'Writing', 'Writing and documents', 27, 'active'),
  ('audio', 'Audio', 'Audio and voice', 28, 'active'),
  ('analytics', 'Analytics', 'Analytics and data', 29, 'active')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status;

-- Listings: active allocation is the rank input.
ALTER TABLE public.listings
  ADD COLUMN allocation_cents integer NOT NULL DEFAULT 0
    CHECK (allocation_cents >= 0),
  ADD COLUMN allocation_set_at timestamptz;

CREATE INDEX listings_allocation_rank_idx
  ON public.listings (allocation_cents DESC, allocation_set_at ASC, id);

-- Thin wallet (no Stripe in this slice).
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_cents integer NOT NULL DEFAULT 0 CHECK (available_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read wallets" ON public.wallets
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  type public.credit_ledger_type NOT NULL,
  reference_type text,
  reference_id uuid,
  reason text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_ledger_user_idx ON public.credit_ledger (user_id, created_at DESC);

GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own ledger" ON public.credit_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read ledger" ON public.credit_ledger
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- Today / Daily competition by UTC date.
CREATE TABLE public.daily_allocations (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  utc_date date NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  first_allocated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, utc_date)
);
CREATE INDEX daily_allocations_date_rank_idx
  ON public.daily_allocations (utc_date, amount_cents DESC, first_allocated_at ASC);

GRANT SELECT ON public.daily_allocations TO anon, authenticated;
GRANT ALL ON public.daily_allocations TO service_role;
ALTER TABLE public.daily_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily allocations are publicly viewable" ON public.daily_allocations
  FOR SELECT USING (true);

-- Live Today ranks (current UTC day). Same shape as all-time rankings.
CREATE TABLE public.today_rankings (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  rank int NOT NULL,
  previous_rank int,
  unique_views int NOT NULL DEFAULT 0,
  shares int NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.today_rankings TO anon, authenticated;
GRANT ALL ON public.today_rankings TO service_role;
ALTER TABLE public.today_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Today rankings are publicly viewable" ON public.today_rankings
  FOR SELECT USING (true);

ALTER TABLE public.today_rankings REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.today_rankings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Frozen Daily archive. Immutable once written.
CREATE TABLE public.daily_rank_snapshots (
  utc_date date NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  rank int NOT NULL,
  allocation_cents integer NOT NULL,
  unique_views int NOT NULL DEFAULT 0,
  shares int NOT NULL DEFAULT 0,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (utc_date, listing_id)
);
CREATE INDEX daily_rank_snapshots_date_idx
  ON public.daily_rank_snapshots (utc_date, rank);

GRANT SELECT ON public.daily_rank_snapshots TO anon, authenticated;
GRANT ALL ON public.daily_rank_snapshots TO service_role;
ALTER TABLE public.daily_rank_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily snapshots are publicly viewable" ON public.daily_rank_snapshots
  FOR SELECT USING (true);

-- All-time + Today recompute. score = allocation_cents. $0 listings are omitted.
CREATE OR REPLACE FUNCTION public.recompute_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (timezone('utc', now()))::date;
BEGIN
  WITH signals AS (
    SELECT
      l.id AS listing_id,
      l.allocation_cents,
      l.allocation_set_at,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'view') AS unique_views,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'share') AS shares
    FROM public.listings l
    LEFT JOIN public.events e ON e.listing_id = l.id
    WHERE l.status = 'approved'
      AND l.allocation_cents >= 1000
    GROUP BY l.id, l.allocation_cents, l.allocation_set_at
  ), ranked AS (
    SELECT
      listing_id,
      unique_views,
      shares,
      allocation_cents::numeric AS score,
      ROW_NUMBER() OVER (
        ORDER BY allocation_cents DESC, allocation_set_at ASC NULLS LAST, listing_id
      ) AS new_rank
    FROM signals
  )
  INSERT INTO public.rankings (listing_id, score, rank, previous_rank, unique_views, shares, computed_at)
  SELECT r.listing_id, r.score, r.new_rank, NULL, r.unique_views, r.shares, now()
  FROM ranked r
  ON CONFLICT (listing_id) DO UPDATE SET
    previous_rank = public.rankings.rank,
    rank = EXCLUDED.rank,
    score = EXCLUDED.score,
    unique_views = EXCLUDED.unique_views,
    shares = EXCLUDED.shares,
    computed_at = now();

  DELETE FROM public.rankings r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = r.listing_id
      AND l.status = 'approved'
      AND l.allocation_cents >= 1000
  );

  WITH signals AS (
    SELECT
      l.id AS listing_id,
      d.amount_cents,
      d.first_allocated_at,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'view') AS unique_views,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'share') AS shares
    FROM public.daily_allocations d
    JOIN public.listings l ON l.id = d.listing_id
    LEFT JOIN public.events e ON e.listing_id = l.id
    WHERE l.status = 'approved'
      AND d.utc_date = today
      AND d.amount_cents >= 1000
    GROUP BY l.id, d.amount_cents, d.first_allocated_at
  ), ranked AS (
    SELECT
      listing_id,
      unique_views,
      shares,
      amount_cents::numeric AS score,
      ROW_NUMBER() OVER (
        ORDER BY amount_cents DESC, first_allocated_at ASC, listing_id
      ) AS new_rank
    FROM signals
  )
  INSERT INTO public.today_rankings (listing_id, score, rank, previous_rank, unique_views, shares, computed_at)
  SELECT r.listing_id, r.score, r.new_rank, NULL, r.unique_views, r.shares, now()
  FROM ranked r
  ON CONFLICT (listing_id) DO UPDATE SET
    previous_rank = public.today_rankings.rank,
    rank = EXCLUDED.rank,
    score = EXCLUDED.score,
    unique_views = EXCLUDED.unique_views,
    shares = EXCLUDED.shares,
    computed_at = now();

  DELETE FROM public.today_rankings t
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.daily_allocations d
    JOIN public.listings l ON l.id = d.listing_id
    WHERE d.listing_id = t.listing_id
      AND d.utc_date = today
      AND d.amount_cents >= 1000
      AND l.status = 'approved'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_rankings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_rankings() TO service_role;

CREATE OR REPLACE FUNCTION public.freeze_daily_board(_utc_date date DEFAULT ((timezone('utc', now()) - interval '1 day')::date))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH signals AS (
    SELECT
      l.id AS listing_id,
      d.amount_cents,
      d.first_allocated_at,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'view') AS unique_views,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'share') AS shares
    FROM public.daily_allocations d
    JOIN public.listings l ON l.id = d.listing_id
    LEFT JOIN public.events e ON e.listing_id = l.id
    WHERE d.utc_date = _utc_date
      AND l.status = 'approved'
      AND d.amount_cents >= 1000
    GROUP BY l.id, d.amount_cents, d.first_allocated_at
  ), ranked AS (
    SELECT
      listing_id,
      amount_cents,
      unique_views,
      shares,
      ROW_NUMBER() OVER (
        ORDER BY amount_cents DESC, first_allocated_at ASC, listing_id
      ) AS new_rank
    FROM signals
  )
  INSERT INTO public.daily_rank_snapshots (
    utc_date, listing_id, rank, allocation_cents, unique_views, shares, frozen_at
  )
  SELECT _utc_date, r.listing_id, r.new_rank, r.amount_cents, r.unique_views, r.shares, now()
  FROM ranked r
  ON CONFLICT (utc_date, listing_id) DO NOTHING;

  PERFORM public.recompute_rankings();
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_daily_board(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.freeze_daily_board(date) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  _user_id uuid,
  _cents integer,
  _reason text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _cents IS NULL OR _cents <= 0 THEN
    RAISE EXCEPTION 'grant must be a positive number of cents';
  END IF;
  IF _cents % 100 <> 0 THEN
    RAISE EXCEPTION 'grant must be in 100-cent increments';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO existing FROM public.credit_ledger WHERE idempotency_key = _idempotency_key;
    IF existing IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'ledger_id', existing);
    END IF;
  END IF;

  INSERT INTO public.wallets (user_id, available_cents)
  VALUES (_user_id, _cents)
  ON CONFLICT (user_id) DO UPDATE
    SET available_cents = public.wallets.available_cents + EXCLUDED.available_cents;

  INSERT INTO public.credit_ledger (
    user_id, amount_cents, type, reference_type, reason, idempotency_key
  ) VALUES (
    _user_id, _cents, 'admin_grant', 'admin_grant', _reason, _idempotency_key
  )
  RETURNING id INTO existing;

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'ledger_id', existing);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_credits(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(uuid, integer, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_allocation(_listing_id uuid, _new_cents integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing public.listings%ROWTYPE;
  wallet_available integer;
  delta integer;
  today date := (timezone('utc', now()))::date;
  today_amount integer := 0;
  today_new integer;
  alltime_first integer;
  alltime_first_id uuid;
  today_first integer;
  today_first_id uuid;
  i_am_alltime_first boolean := false;
  i_am_today_first boolean := false;
BEGIN
  IF _new_cents IS NULL OR _new_cents < 0 THEN
    RAISE EXCEPTION 'Allocation must be a non-negative integer number of cents.';
  END IF;
  IF _new_cents <> 0 AND _new_cents < 1000 THEN
    RAISE EXCEPTION 'Minimum allocation is 1000 cents.';
  END IF;
  IF _new_cents % 100 <> 0 THEN
    RAISE EXCEPTION 'Allocation must be in 100-cent increments.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('bid-ladder-allocation'));

  SELECT * INTO listing
  FROM public.listings
  WHERE id = _listing_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found';
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() <> listing.owner_id
     AND NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  delta := _new_cents - listing.allocation_cents;
  IF delta = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'noop', true,
      'allocation_cents', listing.allocation_cents
    );
  END IF;

  INSERT INTO public.wallets (user_id, available_cents)
  VALUES (listing.owner_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT available_cents INTO wallet_available
  FROM public.wallets
  WHERE user_id = listing.owner_id
  FOR UPDATE;

  IF delta > 0 AND wallet_available < delta THEN
    RAISE EXCEPTION 'insufficient credits';
  END IF;

  SELECT l.allocation_cents, l.id
  INTO alltime_first, alltime_first_id
  FROM public.listings l
  WHERE l.status = 'approved'
    AND l.allocation_cents >= 1000
  ORDER BY l.allocation_cents DESC, l.allocation_set_at ASC NULLS LAST, l.id
  LIMIT 1;
  i_am_alltime_first := alltime_first_id IS NOT NULL AND alltime_first_id = _listing_id;

  SELECT d.amount_cents INTO today_amount
  FROM public.daily_allocations d
  WHERE d.listing_id = _listing_id AND d.utc_date = today;
  today_amount := COALESCE(today_amount, 0);
  today_new := GREATEST(0, today_amount + delta);

  SELECT d.amount_cents, d.listing_id
  INTO today_first, today_first_id
  FROM public.daily_allocations d
  JOIN public.listings l ON l.id = d.listing_id
  WHERE d.utc_date = today
    AND l.status = 'approved'
    AND d.amount_cents >= 1000
  ORDER BY d.amount_cents DESC, d.first_allocated_at ASC, d.listing_id
  LIMIT 1;
  i_am_today_first := today_first_id IS NOT NULL AND today_first_id = _listing_id;

  IF delta > 0 THEN
    IF NOT i_am_alltime_first
       AND alltime_first IS NOT NULL
       AND _new_cents > alltime_first
       AND _new_cents < alltime_first + 500 THEN
      RAISE EXCEPTION 'taking all-time #1 requires current #1 plus 500 cents';
    END IF;
    IF NOT i_am_today_first
       AND today_first IS NOT NULL
       AND today_new > today_first
       AND today_new < today_first + 500 THEN
      RAISE EXCEPTION 'taking today #1 requires current #1 plus 500 cents';
    END IF;
  END IF;

  UPDATE public.wallets
  SET available_cents = available_cents - delta
  WHERE user_id = listing.owner_id;

  UPDATE public.listings
  SET allocation_cents = _new_cents,
      allocation_set_at = now()
  WHERE id = _listing_id;

  INSERT INTO public.daily_allocations (listing_id, utc_date, amount_cents, first_allocated_at)
  VALUES (_listing_id, today, today_new, now())
  ON CONFLICT (listing_id, utc_date) DO UPDATE SET
    amount_cents = EXCLUDED.amount_cents,
    first_allocated_at = EXCLUDED.first_allocated_at;

  IF today_new = 0 THEN
    DELETE FROM public.daily_allocations
    WHERE listing_id = _listing_id AND utc_date = today AND amount_cents = 0;
  END IF;

  INSERT INTO public.credit_ledger (
    user_id, amount_cents, type, reference_type, reference_id
  ) VALUES (
    listing.owner_id,
    CASE WHEN delta > 0 THEN -delta ELSE -delta END,
    CASE WHEN delta > 0 THEN 'allocation'::public.credit_ledger_type
         ELSE 'allocation_release'::public.credit_ledger_type END,
    'listing',
    _listing_id
  );

  PERFORM public.recompute_rankings();

  RETURN jsonb_build_object(
    'ok', true,
    'allocation_cents', _new_cents,
    'delta_cents', delta,
    'today_cents', today_new
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_allocation(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_allocation(uuid, integer) TO authenticated, service_role;

-- Replace the 5-minute organic freshness cron with UTC midnight freeze.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recompute-rankings') THEN
    PERFORM cron.unschedule('recompute-rankings');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'freeze-daily-board') THEN
    PERFORM cron.unschedule('freeze-daily-board');
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'freeze-daily-board',
    '0 0 * * *',
    $$SELECT public.freeze_daily_board();$$
  );
EXCEPTION
  WHEN undefined_function THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
