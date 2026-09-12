CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'));

DROP POLICY "Admins can view all listings" ON public.listings;
CREATE POLICY "Admins can view all listings" ON public.listings FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
DROP POLICY "Admins can review listings" ON public.listings;
CREATE POLICY "Admins can review listings" ON public.listings FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY "Admins can read events" ON public.events;
CREATE POLICY "Admins can read events" ON public.events FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
DROP POLICY "Admins can write audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can write audit log" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

DROP FUNCTION public.has_role(uuid, public.app_role);

REVOKE EXECUTE ON FUNCTION public.recompute_rankings() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_rankings() TO service_role;