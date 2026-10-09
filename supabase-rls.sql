ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS envios_admin_guard ON public.envios;
CREATE POLICY envios_admin_guard
  ON public.envios
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS envios_admin_access ON public.envios;
CREATE POLICY envios_admin_access
  ON public.envios
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.envios TO authenticated;

--After creating the admin user, set its server-managed role claim once:

UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'yordiperaza.c@gmail.com';

UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'josuacastillo59@gmail.com';

CREATE TABLE IF NOT EXISTS public.admin_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  last_seen_at timestamptz
);

ALTER TABLE public.admin_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_presence_admin_guard ON public.admin_presence;
CREATE POLICY admin_presence_admin_guard
  ON public.admin_presence
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_presence_admin_read ON public.admin_presence;
CREATE POLICY admin_presence_admin_read
  ON public.admin_presence
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_presence_own_insert ON public.admin_presence;
CREATE POLICY admin_presence_own_insert
  ON public.admin_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS admin_presence_own_update ON public.admin_presence;
CREATE POLICY admin_presence_own_update
  ON public.admin_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_presence TO authenticated;

INSERT INTO public.admin_presence (user_id, email)
SELECT id, email
FROM auth.users
WHERE raw_app_meta_data ->> 'role' = 'admin'
  AND email IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email;

-- Re-run the INSERT above after granting the admin role to another user so
-- that the allowed-user list includes the account before its first login.
