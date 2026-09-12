-- 1) Remove anon/authenticated direct insert path
DROP POLICY IF EXISTS "Anyone can record events for approved listings" ON public.events;
REVOKE INSERT ON public.events FROM anon;
REVOKE INSERT ON public.events FROM authenticated;

-- 2) Dedupe guarantee (unique views/shares semantics)
CREATE UNIQUE INDEX IF NOT EXISTS events_unique_visitor_kind_idx
  ON public.events(listing_id, kind, visitor_key);

CREATE INDEX IF NOT EXISTS events_visitor_created_idx
  ON public.events(visitor_key, created_at DESC);

-- 3) Server-only recorder with approval check + rate limit
CREATE OR REPLACE FUNCTION public.record_event(
  _listing_id uuid,
  _kind public.event_kind,
  _visitor_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  IF _visitor_key IS NULL OR length(_visitor_key) < 8 THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = _listing_id AND l.status = 'approved'
  ) THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.events e
  WHERE e.visitor_key = _visitor_key
    AND e.created_at > now() - interval '1 hour';

  IF recent_count >= 20 THEN
    RETURN false;
  END IF;

  INSERT INTO public.events (listing_id, kind, visitor_key)
  VALUES (_listing_id, _kind, _visitor_key)
  ON CONFLICT (listing_id, kind, visitor_key) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_event(uuid, public.event_kind, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_event(uuid, public.event_kind, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_event(uuid, public.event_kind, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_event(uuid, public.event_kind, text) TO service_role;