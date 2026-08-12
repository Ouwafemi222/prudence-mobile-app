-- Super admin may operate any office as office admin (RLS + helper alignment)

CREATE OR REPLACE FUNCTION public.user_is_office_admin(p_user_id uuid, p_office_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_is_super_admin(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = p_user_id
        AND ur.role = 'office_admin'::public.app_role
        AND (p_office_id IS NULL OR p.office_id = p_office_id)
    );
$$;

-- offices: super_admin may update any office (in addition to office_admin own-office policy)
DROP POLICY IF EXISTS "Super admins can update offices" ON public.offices;
CREATE POLICY "Super admins can update offices"
  ON public.offices FOR UPDATE TO authenticated
  USING (public.user_is_super_admin(auth.uid()))
  WITH CHECK (public.user_is_super_admin(auth.uid()));
