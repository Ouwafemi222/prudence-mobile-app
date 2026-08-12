-- Role-based visibility + comments
-- Rules:
-- - super_admin/trainer: view all submissions, comment on all, verify/update all
-- - sub_trainer: view submissions within their assigned group, comment within group, verify/update within group
-- - pro: view all submissions (read-only)

-- Helper: sub-trainer group access
CREATE OR REPLACE FUNCTION public.sub_trainer_can_access_user(_sub_trainer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles st
    JOIN public.profiles target
      ON target.assigned_group_id = st.assigned_group_id
    WHERE st.user_id = _sub_trainer_id
      AND target.user_id = _target_user_id
      AND st.assigned_group_id IS NOT NULL
  );
$$;

-- Extend profiles visibility
DROP POLICY IF EXISTS "Pros can view all profiles" ON public.profiles;
CREATE POLICY "Pros can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'pro'));

DROP POLICY IF EXISTS "Sub-trainers can view group profiles" ON public.profiles;
CREATE POLICY "Sub-trainers can view group profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);

-- Extend daily_activities visibility
DROP POLICY IF EXISTS "Pros can view all activities" ON public.daily_activities;
CREATE POLICY "Pros can view all activities"
ON public.daily_activities FOR SELECT
USING (public.has_role(auth.uid(), 'pro'));

DROP POLICY IF EXISTS "Sub-trainers can view group activities" ON public.daily_activities;
CREATE POLICY "Sub-trainers can view group activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);

-- Allow sub-trainers to update activities in their group (for verification + feedback)
DROP POLICY IF EXISTS "Sub-trainers can update group activities" ON public.daily_activities;
CREATE POLICY "Sub-trainers can update group activities"
ON public.daily_activities FOR UPDATE
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.activity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.daily_activities(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

-- Helper: can current viewer see the activity?
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
        OR public.has_role(_viewer_id, 'pro')
        OR (
          public.has_role(_viewer_id, 'sub_trainer')
          AND public.sub_trainer_can_access_user(_viewer_id, da.user_id)
        )
      )
  );
$$;

-- Comments policies
DROP POLICY IF EXISTS "View comments for accessible activities" ON public.activity_comments;
CREATE POLICY "View comments for accessible activities"
ON public.activity_comments FOR SELECT
USING (public.can_view_activity(auth.uid(), activity_id));

DROP POLICY IF EXISTS "Insert comments for accessible activities" ON public.activity_comments;
CREATE POLICY "Insert comments for accessible activities"
ON public.activity_comments FOR INSERT
WITH CHECK (
  author_user_id = auth.uid()
  AND public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'sub_trainer')
    OR EXISTS (
      SELECT 1
      FROM public.daily_activities da
      WHERE da.id = activity_id
        AND da.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Delete own comments (or admin)" ON public.activity_comments;
CREATE POLICY "Delete own comments (or admin)"
ON public.activity_comments FOR DELETE
USING (
  author_user_id = auth.uid()
  OR public.is_admin(auth.uid())
);


