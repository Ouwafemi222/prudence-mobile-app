-- Phase 1: Scope RLS policies and access helpers by office_id (super_admin bypass)

CREATE OR REPLACE FUNCTION public.user_can_access_office(p_office_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_is_super_admin(auth.uid())
    OR p_office_id IS NOT DISTINCT FROM public.get_user_office_id(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_office(uuid) TO authenticated;

-- Sponsor downlines stay within the sponsor's office
CREATE OR REPLACE FUNCTION public.get_sponsor_downlines(p_sponsor_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  sponsor_username text,
  depth integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT
      p.user_id,
      p.username,
      p.sponsor_username,
      1 AS depth,
      ARRAY[p.username]::text[] AS path,
      p.office_id
    FROM public.profiles p
    WHERE p.sponsor_username = (
      SELECT s.username FROM public.profiles s WHERE s.user_id = p_sponsor_user_id LIMIT 1
    )
    AND p.office_id = (
      SELECT s.office_id FROM public.profiles s WHERE s.user_id = p_sponsor_user_id LIMIT 1
    )

    UNION ALL

    SELECT
      c.user_id,
      c.username,
      c.sponsor_username,
      t.depth + 1 AS depth,
      t.path || c.username,
      t.office_id
    FROM public.profiles c
    JOIN tree t ON c.sponsor_username = t.username AND c.office_id = t.office_id
    WHERE NOT (c.username = ANY(t.path))
  )
  SELECT tree.user_id, tree.username, tree.sponsor_username, tree.depth
  FROM tree;
$$;

CREATE OR REPLACE FUNCTION public.sponsor_can_access_user(_sponsor_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.users_share_office(_sponsor_user_id, _target_user_id)
    AND (
      _sponsor_user_id = _target_user_id
      OR EXISTS (
        SELECT 1
        FROM public.get_sponsor_downlines(_sponsor_user_id) d
        WHERE d.user_id = _target_user_id
      )
    );
$$;

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
     AND target.office_id = pro.office_id
    WHERE pro.user_id = _pro_id
      AND target.user_id = _target_user_id
      AND pro.assigned_group_id IS NOT NULL
      AND pro.approval_status = 'approved'
      AND target.approval_status = 'approved'
  );
$$;

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
        public.user_is_super_admin(_viewer_id)
        OR da.office_id IS NOT DISTINCT FROM public.get_user_office_id(_viewer_id)
      )
      AND (
        da.user_id = _viewer_id
        OR public.is_admin(_viewer_id)
        OR public.user_is_office_admin(_viewer_id, da.office_id)
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

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Pros can view group profiles" ON public.profiles;
CREATE POLICY "Pros can view group profiles"
ON public.profiles FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Sponsors can view downline profiles" ON public.profiles;
CREATE POLICY "Sponsors can view downline profiles"
ON public.profiles FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
);

-- user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Sponsors can view downline roles" ON public.user_roles;
CREATE POLICY "Sponsors can view downline roles"
ON public.user_roles FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Trainers can insert limited roles" ON public.user_roles;
CREATE POLICY "Trainers can insert limited roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'trainer')
  AND role IN ('pro'::public.app_role, 'sponsor'::public.app_role, 'member'::public.app_role)
);

DROP POLICY IF EXISTS "Trainers can update limited roles" ON public.user_roles;
CREATE POLICY "Trainers can update limited roles"
ON public.user_roles FOR UPDATE
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'trainer')
  AND role IN ('pro'::public.app_role, 'sponsor'::public.app_role, 'member'::public.app_role)
);

DROP POLICY IF EXISTS "Trainers can delete limited roles" ON public.user_roles;
CREATE POLICY "Trainers can delete limited roles"
ON public.user_roles FOR DELETE
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'trainer')
  AND role IN ('pro'::public.app_role, 'sponsor'::public.app_role, 'member'::public.app_role)
);

-- groups
DROP POLICY IF EXISTS "Approved users can view groups" ON public.groups;
CREATE POLICY "Approved users can view groups"
ON public.groups FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage groups" ON public.groups;
CREATE POLICY "Admins can manage groups"
ON public.groups FOR ALL
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
)
WITH CHECK (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

-- daily_activities
DROP POLICY IF EXISTS "Admins can view all activities" ON public.daily_activities;
CREATE POLICY "Admins can view all activities"
ON public.daily_activities FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Admins can update any activities" ON public.daily_activities;
CREATE POLICY "Admins can update any activities"
ON public.daily_activities FOR UPDATE
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Pros can view group activities" ON public.daily_activities;
CREATE POLICY "Pros can view group activities"
ON public.daily_activities FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Sponsors can view downline activities" ON public.daily_activities;
CREATE POLICY "Sponsors can view downline activities"
ON public.daily_activities FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- weekly_reports
DROP POLICY IF EXISTS "Admins can view all weekly reports" ON public.weekly_reports;
CREATE POLICY "Admins can view all weekly reports"
ON public.weekly_reports FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Users can manage their own weekly reports" ON public.weekly_reports;
CREATE POLICY "Users can manage their own weekly reports"
ON public.weekly_reports FOR ALL
USING (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
)
WITH CHECK (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
);

-- monthly_goals
DROP POLICY IF EXISTS "Admins can view all monthly goals" ON public.monthly_goals;
CREATE POLICY "Admins can view all monthly goals"
ON public.monthly_goals FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Users can manage their own monthly goals" ON public.monthly_goals;
CREATE POLICY "Users can manage their own monthly goals"
ON public.monthly_goals FOR ALL
USING (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
)
WITH CHECK (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
);

-- daily_todos
DROP POLICY IF EXISTS "Admins can view all daily todos" ON public.daily_todos;
CREATE POLICY "Admins can view all daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Pros can view group daily todos" ON public.daily_todos;
CREATE POLICY "Pros can view group daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Sponsors can view downline daily todos" ON public.daily_todos;
CREATE POLICY "Sponsors can view downline daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can insert own daily todos for today" ON public.daily_todos;
CREATE POLICY "Users can insert own daily todos for today"
ON public.daily_todos FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
  AND public.is_todo_date_editable(todo_date)
);

DROP POLICY IF EXISTS "Users can update own daily todos for today" ON public.daily_todos;
CREATE POLICY "Users can update own daily todos for today"
ON public.daily_todos FOR UPDATE
USING (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
  AND public.is_todo_date_editable(todo_date)
)
WITH CHECK (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
  AND public.is_todo_date_editable(todo_date)
);

-- daily_todo_logs
DROP POLICY IF EXISTS "Admins can view all daily todo logs" ON public.daily_todo_logs;
CREATE POLICY "Admins can view all daily todo logs"
ON public.daily_todo_logs FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Pros can view group daily todo logs" ON public.daily_todo_logs;
CREATE POLICY "Pros can view group daily todo logs"
ON public.daily_todo_logs FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Sponsors can view downline daily todo logs" ON public.daily_todo_logs;
CREATE POLICY "Sponsors can view downline daily todo logs"
ON public.daily_todo_logs FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- skills
DROP POLICY IF EXISTS "Users can view active skills" ON public.skills;
CREATE POLICY "Users can view active skills"
ON public.skills FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND is_active = true
  AND public.is_approved(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage skills" ON public.skills;
CREATE POLICY "Admins can manage skills"
ON public.skills FOR ALL
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
)
WITH CHECK (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

-- user_skills
DROP POLICY IF EXISTS "Admins can view all skill assignments" ON public.user_skills;
CREATE POLICY "Admins can view all skill assignments"
ON public.user_skills FOR SELECT
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Admins can insert skill assignments" ON public.user_skills;
CREATE POLICY "Admins can insert skill assignments"
ON public.user_skills FOR INSERT
WITH CHECK (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

DROP POLICY IF EXISTS "Admins can update skill assignments" ON public.user_skills;
CREATE POLICY "Admins can update skill assignments"
ON public.user_skills FOR UPDATE
USING (
  public.user_can_access_office(office_id)
  AND (
    public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);

-- notifications (system insert unchanged; scope user reads)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (
  auth.uid() = user_id
  AND public.user_can_access_office(office_id)
);

-- activity comments delete policy office scope
DROP POLICY IF EXISTS "Delete own comments (or admin)" ON public.activity_comments;
CREATE POLICY "Delete own comments (or admin)"
ON public.activity_comments FOR DELETE
USING (
  public.user_can_access_office(office_id)
  AND (
    author_user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.user_is_office_admin(auth.uid(), office_id)
  )
);
