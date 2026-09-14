-- Points wallet + Stripe credit top-up.
-- 1 point = 1 cent. Ledger types topup / points_conversion already exist.

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS available_points integer NOT NULL DEFAULT 0
    CHECK (available_points >= 0);

CREATE TYPE public.point_ledger_type AS ENUM (
  'admin_grant',
  'conversion',
  'adjustment'
);

CREATE TABLE public.point_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_points integer NOT NULL,
  type public.point_ledger_type NOT NULL,
  reference_type text,
  reference_id uuid,
  reason text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX point_ledger_user_idx ON public.point_ledger (user_id, created_at DESC);

GRANT SELECT ON public.point_ledger TO authenticated;
GRANT ALL ON public.point_ledger TO service_role;
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own point ledger" ON public.point_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read point ledger" ON public.point_ledger
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_grant_points(
  _user_id uuid,
  _points integer,
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
$$;

REVOKE ALL ON FUNCTION public.admin_grant_points(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_points(uuid, integer, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.admin_grant_points(uuid, integer, text, text) FROM anon;

CREATE OR REPLACE FUNCTION public.convert_points_to_credits(_points integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet public.wallets%ROWTYPE;
  converted_cents integer;
BEGIN
  IF auth.uid() IS NULL THEN
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

  -- 1 point = 1 cent.
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
$$;

REVOKE ALL ON FUNCTION public.convert_points_to_credits(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_points_to_credits(integer) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.convert_points_to_credits(integer) FROM anon;

CREATE OR REPLACE FUNCTION public.apply_credit_topup(
  _user_id uuid,
  _cents integer,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
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
$$;

REVOKE ALL ON FUNCTION public.apply_credit_topup(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_credit_topup(uuid, integer, text) TO service_role;
