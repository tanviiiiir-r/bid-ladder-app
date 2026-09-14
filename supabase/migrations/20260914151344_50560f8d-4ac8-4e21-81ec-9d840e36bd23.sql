-- 1) Internal top-up routine is service-only
REVOKE EXECUTE ON FUNCTION public.apply_credit_topup(uuid, integer, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_credit_topup(_user_id uuid, _cents integer, _idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing uuid;
BEGIN
  IF current_user <> 'service_role' OR auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'service role only';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user required';
  END IF;
  IF _cents IS NULL OR _cents <= 0 THEN
    RAISE EXCEPTION 'top-up must be a positive number of cents';
  END IF;
  IF _cents % 100 <> 0 THEN
    RAISE EXCEPTION 'top-up must be in 100-cent increments';
  END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 8 THEN
    RAISE EXCEPTION 'idempotency key required';
  END IF;

  SELECT id INTO existing FROM public.credit_ledger WHERE idempotency_key = _idempotency_key;
  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'ledger_id', existing);
  END IF;

  INSERT INTO public.wallets (user_id, available_cents)
  VALUES (_user_id, _cents)
  ON CONFLICT (user_id) DO UPDATE
    SET available_cents = public.wallets.available_cents + EXCLUDED.available_cents;

  INSERT INTO public.credit_ledger (
    user_id, amount_cents, type, reference_type, reason, idempotency_key
  ) VALUES (
    _user_id, _cents, 'topup', 'stripe', 'Stripe credit top-up', _idempotency_key
  )
  RETURNING id INTO existing;

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'ledger_id', existing);
END;
$function$;

-- 2) Admin grants: system OR signed-in admin only (no null-uid bypass)
CREATE OR REPLACE FUNCTION public.admin_grant_credits(_user_id uuid, _cents integer, _reason text DEFAULT NULL::text, _idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing uuid;
BEGIN
  IF NOT (
    current_user = 'service_role'
    OR (auth.uid() IS NOT NULL AND private.has_role(auth.uid(), 'admin'))
  ) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_grant_points(_user_id uuid, _points integer, _reason text DEFAULT NULL::text, _idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing uuid;
BEGIN
  IF NOT (
    current_user = 'service_role'
    OR (auth.uid() IS NOT NULL AND private.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _points IS NULL OR _points <= 0 THEN
    RAISE EXCEPTION 'grant must be a positive number of points';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO existing FROM public.point_ledger WHERE idempotency_key = _idempotency_key;
    IF existing IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'ledger_id', existing);
    END IF;
  END IF;

  INSERT INTO public.wallets (user_id, available_cents, available_points)
  VALUES (_user_id, 0, _points)
  ON CONFLICT (user_id) DO UPDATE
    SET available_points = public.wallets.available_points + EXCLUDED.available_points;

  INSERT INTO public.point_ledger (
    user_id, amount_points, type, reference_type, reason, idempotency_key
  ) VALUES (
    _user_id, _points, 'admin_grant', 'admin_grant', _reason, _idempotency_key
  )
  RETURNING id INTO existing;

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'ledger_id', existing);
END;
$function$;

-- 3) set_allocation: system OR signed-in owner/admin only
CREATE OR REPLACE FUNCTION public.set_allocation(_listing_id uuid, _new_cents integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NOT (
    current_user = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND (auth.uid() = listing.owner_id OR private.has_role(auth.uid(), 'admin'))
    )
  ) THEN
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
    -delta,
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
$function$;

-- 4) convert_points_to_credits: signed-in user only (explicit)
CREATE OR REPLACE FUNCTION public.convert_points_to_credits(_points integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  wallet public.wallets%ROWTYPE;
  converted_cents integer;
BEGIN
  IF auth.uid() IS NULL OR current_user NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _points IS NULL OR _points < 0 THEN
    RAISE EXCEPTION 'points must be a non-negative integer';
  END IF;
  IF _points = 0 THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'converted_cents', 0);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('bid-ladder-points-' || auth.uid()::text));

  INSERT INTO public.wallets (user_id, available_cents, available_points)
  VALUES (auth.uid(), 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO wallet
  FROM public.wallets
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF wallet.available_points < _points THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  converted_cents := _points;

  UPDATE public.wallets
  SET available_points = available_points - _points,
      available_cents = available_cents + converted_cents
  WHERE user_id = auth.uid();

  INSERT INTO public.point_ledger (
    user_id, amount_points, type, reference_type
  ) VALUES (
    auth.uid(), -_points, 'conversion', 'points_conversion'
  );

  INSERT INTO public.credit_ledger (
    user_id, amount_cents, type, reference_type, reason
  ) VALUES (
    auth.uid(), converted_cents, 'points_conversion', 'points_conversion',
    'Converted ' || _points || ' points'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'converted_cents', converted_cents,
    'points_spent', _points
  );
END;
$function$;

-- 5) Profiles: no blanket public read
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved listing owners are publicly viewable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.owner_id = public.profiles.id
      AND l.status = 'approved'
  )
);