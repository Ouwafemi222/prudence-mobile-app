-- Remove sub_trainer role entirely and scope "pro" access to same-group only.
--
-- New rules:
-- - super_admin/trainer: full admin visibility + verification
-- - pro: can view submissions + todos + profiles of members in the same assigned_group_id and can comment within that scope
-- - sponsor: unchanged (downline scoped via sponsor_can_access_user)
-- - member: self only

-- 1) Drop policies/functions that reference sub_trainer (must happen before enum change)
DROP POLICY IF EXISTS "Sub-trainers can view group profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sub-trainers can view group activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Sub-trainers can update group activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Sub-trainers can view group daily todos" ON public.daily_todos;

DROP POLICY IF EXISTS "Upsert section verifications (admins/sub-trainers)" ON public.activity_section_verifications;
DROP POLICY IF EXISTS "Update section verifications (admins/sub-trainers)" ON public.activity_section_verifications;

DROP FUNCTION IF EXISTS public.sub_trainer_can_access_user(uuid, uuid);

-- IMPORTANT: app_role enum swap requires dropping/recreating *all* policies that reference app_role literals.
-- Otherwise they keep dependencies on the old enum OID (and will break function resolution).
DROP POLICY IF EXISTS "Pros can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sponsors can view downline profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pros can view all activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Sponsors can view downline activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Pros can view all daily todos" ON public.daily_todos;
DROP POLICY IF EXISTS "Sponsors can view downline daily todos" ON public.daily_todos;
DROP POLICY IF EXISTS "Sponsors can view downline roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Super admins can delete suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Super admins can update suggestion attachments" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete suggestion attachments" ON storage.objects;

-- Trainer role-management policies: remove sub_trainer from allowed list
DROP POLICY IF EXISTS "Trainers can insert limited roles" ON public.user_roles;
DROP POLICY IF EXISTS "Trainers can update limited roles" ON public.user_roles;
DROP POLICY IF EXISTS "Trainers can delete limited roles" ON public.user_roles;

CREATE POLICY "Trainers can insert limited roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'trainer')
  AND (role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role]))
);

CREATE POLICY "Trainers can update limited roles"
ON public.user_roles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'trainer')
  AND (role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role]))
)
WITH CHECK (
  role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role])
);

CREATE POLICY "Trainers can delete limited roles"
ON public.user_roles FOR DELETE
USING (
  public.has_role(auth.uid(), 'trainer')
  AND (role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role]))
);

-- 2) Migrate any existing sub_trainer roles to pro (least privilege, group-scoped)
DELETE FROM public.user_roles ur
WHERE ur.role = 'sub_trainer'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
      AND ur2.role = 'pro'
  );

UPDATE public.user_roles
SET role = 'pro'
WHERE role = 'sub_trainer';

-- 3) Replace enum type to remove sub_trainer
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'trainer', 'pro', 'sponsor', 'member');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING role::text::public.app_role;

-- Recreate has_role() signature so casts keep working after enum swap
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Recreate is_admin() against the new enum type
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('super_admin'::public.app_role, 'trainer'::public.app_role)
    )
$$;

DROP TYPE public.app_role_old;

-- 4) Pro group access helper
CREATE OR REPLACE FUNCTION public.pro_can_access_user(_pro_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pro
    JOIN public.profiles target
      ON target.assigned_group_id = pro.assigned_group_id
    WHERE pro.user_id = _pro_id
      AND target.user_id = _target_user_id
      AND pro.assigned_group_id IS NOT NULL
      AND pro.approval_status = 'approved'
      AND target.approval_status = 'approved'
  );
$$;

-- 5) Tighten "pro" visibility (profiles)
CREATE POLICY "Pros can view group profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

-- Sponsors can view their full downline tree (unchanged semantics)
CREATE POLICY "Sponsors can view downline profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- 6) Tighten "pro" visibility (daily_activities)
CREATE POLICY "Pros can view group activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

-- Sponsors can view activities for their tree (unchanged semantics)
CREATE POLICY "Sponsors can view downline activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- 7) Tighten "pro" visibility (daily_todos)
CREATE POLICY "Pros can view group daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

-- Sponsors can view daily todos for their tree (unchanged semantics)
CREATE POLICY "Sponsors can view downline daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- 8) Update can_view_activity() for comments + section-verifications view
CREATE OR REPLACE FUNCTION public.can_view_activity(_viewer_id uuid, _activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.daily_activities da
    WHERE da.id = _activity_id
      AND (
        da.user_id = _viewer_id
        OR public.is_admin(_viewer_id)
        OR (
          public.has_role(_viewer_id, 'sponsor')
          AND public.sponsor_can_access_user(_viewer_id, da.user_id)
        )
        OR (
          public.has_role(_viewer_id, 'pro')
          AND public.pro_can_access_user(_viewer_id, da.user_id)
        )
      )
  );
$$;

-- 9) Comments: allow pros (group scoped via can_view_activity)
DROP POLICY IF EXISTS "Insert comments for accessible activities" ON public.activity_comments;
CREATE POLICY "Insert comments for accessible activities"
ON public.activity_comments FOR INSERT
WITH CHECK (
  author_user_id = auth.uid()
  AND public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'pro')
    OR EXISTS (
      SELECT 1
      FROM public.daily_activities da
      WHERE da.id = activity_id
        AND da.user_id = auth.uid()
    )
  )
);

-- 10) Section verifications: admins only (no sub-trainers)
CREATE POLICY "Upsert section verifications (admins)"
ON public.activity_section_verifications FOR INSERT
WITH CHECK (
  public.can_view_activity(auth.uid(), activity_id)
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Update section verifications (admins)"
ON public.activity_section_verifications FOR UPDATE
USING (
  public.can_view_activity(auth.uid(), activity_id)
  AND public.is_admin(auth.uid())
);

-- user_roles policies re-created against the new enum
CREATE POLICY "Super admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Sponsors can view downline roles"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- suggestions policies re-created against the new enum
CREATE POLICY "Super admins can view suggestions"
ON public.suggestions FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete suggestions"
ON public.suggestions FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- storage policies re-created against the new enum
CREATE POLICY "Super admins can update suggestion attachments"
ON storage.objects FOR UPDATE
USING ((bucket_id = 'suggestion_attachments'::text) AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete suggestion attachments"
ON storage.objects FOR DELETE
USING ((bucket_id = 'suggestion_attachments'::text) AND public.has_role(auth.uid(), 'super_admin'));
