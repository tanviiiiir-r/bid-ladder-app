-- roles
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.listing_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.event_kind AS ENUM ('view','share');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- shared updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly viewable" ON public.categories FOR SELECT USING (true);
INSERT INTO public.categories (slug, name, sort_order) VALUES
  ('ai','AI',1), ('saas','SaaS',2), ('tools','Tools',3);

-- listings
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  name text NOT NULL,
  tagline text NOT NULL,
  url text NOT NULL,
  description text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  status public.listing_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_status_idx ON public.listings(status);
CREATE INDEX listings_category_idx ON public.listings(category_id);
GRANT SELECT, INSERT, UPDATE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved listings are public" ON public.listings FOR SELECT USING (status = 'approved');
CREATE POLICY "Owners can view own listings" ON public.listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Admins can view all listings" ON public.listings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners can submit listings" ON public.listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND status = 'pending');
CREATE POLICY "Admins can review listings" ON public.listings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- events (real signals only)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kind public.event_kind NOT NULL,
  visitor_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, kind, visitor_key)
);
CREATE INDEX events_listing_idx ON public.events(listing_id);
GRANT INSERT ON public.events TO anon, authenticated;
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record events for approved listings" ON public.events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'approved'));
CREATE POLICY "Admins can read events" ON public.events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- rankings
CREATE TABLE public.rankings (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  rank int NOT NULL,
  previous_rank int,
  unique_views int NOT NULL DEFAULT 0,
  shares int NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rankings TO anon, authenticated;
GRANT ALL ON public.rankings TO service_role;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rankings are publicly viewable" ON public.rankings FOR SELECT USING (true);

-- admin audit log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can write audit log" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

-- ranking v0.1: unique views + shares + freshness, no payments
CREATE OR REPLACE FUNCTION public.recompute_rankings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH signals AS (
    SELECT l.id AS listing_id,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'view') AS unique_views,
      COUNT(DISTINCT e.visitor_key) FILTER (WHERE e.kind = 'share') AS shares,
      GREATEST(0, 30 - EXTRACT(EPOCH FROM (now() - COALESCE(l.approved_at, l.created_at))) / 86400.0) AS freshness_days
    FROM public.listings l
    LEFT JOIN public.events e ON e.listing_id = l.id
    WHERE l.status = 'approved'
    GROUP BY l.id, l.approved_at, l.created_at
  ), scored AS (
    SELECT listing_id, unique_views, shares,
      (unique_views * 3.0 + shares * 5.0 + freshness_days * 1.5) AS score
    FROM signals
  ), ranked AS (
    SELECT listing_id, unique_views, shares, score,
      ROW_NUMBER() OVER (ORDER BY score DESC, listing_id) AS new_rank
    FROM scored
  )
  INSERT INTO public.rankings (listing_id, score, rank, previous_rank, unique_views, shares, computed_at)
  SELECT r.listing_id, r.score, r.new_rank, NULL, r.unique_views, r.shares, now() FROM ranked r
  ON CONFLICT (listing_id) DO UPDATE SET
    previous_rank = public.rankings.rank,
    rank = EXCLUDED.rank,
    score = EXCLUDED.score,
    unique_views = EXCLUDED.unique_views,
    shares = EXCLUDED.shares,
    computed_at = now();

  DELETE FROM public.rankings r
  WHERE NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.id = r.listing_id AND l.status = 'approved');
END; $$;

GRANT EXECUTE ON FUNCTION public.recompute_rankings() TO anon, authenticated, service_role;