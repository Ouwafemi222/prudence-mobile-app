-- Recursive sponsor downlines (downline of downline ...)

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
      ARRAY[p.username]::text[] AS path
    FROM public.profiles p
    WHERE p.sponsor_username = (
      SELECT s.username
      FROM public.profiles s
      WHERE s.user_id = p_sponsor_user_id
      LIMIT 1
    )

    UNION ALL

    SELECT
      c.user_id,
      c.username,
      c.sponsor_username,
      t.depth + 1 AS depth,
      t.path || c.username
    FROM public.profiles c
    JOIN tree t ON c.sponsor_username = t.username
    WHERE NOT (c.username = ANY(t.path))
  )
  SELECT user_id, username, sponsor_username, depth
  FROM tree;
$$;

CREATE OR REPLACE FUNCTION public.sponsor_can_access_user(_sponsor_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _sponsor_user_id = _target_user_id
    OR EXISTS (
      SELECT 1
      FROM public.get_sponsor_downlines(_sponsor_user_id) d
      WHERE d.user_id = _target_user_id
    )
  );
$$;

-- Profiles: sponsors can view their full downline tree
DROP POLICY IF EXISTS "Sponsors can view downline profiles" ON public.profiles;
CREATE POLICY "Sponsors can view downline profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- Daily activities: sponsors can view activities for their tree
DROP POLICY IF EXISTS "Sponsors can view downline activities" ON public.daily_activities;
CREATE POLICY "Sponsors can view downline activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- Roles: sponsors can view roles for their tree
DROP POLICY IF EXISTS "Sponsors can view downline roles" ON public.user_roles;
CREATE POLICY "Sponsors can view downline roles"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- Todos: sponsors can view daily todos for their tree
DROP POLICY IF EXISTS "Sponsors can view downline daily todos" ON public.daily_todos;
CREATE POLICY "Sponsors can view downline daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);


