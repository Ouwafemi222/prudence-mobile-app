-- Sponsor dashboard fixes:
-- 1) Make sponsor downline tree case-insensitive (username comparisons).
-- 2) Allow sponsor/pro to fetch weekly/monthly reports for allowed users only (secure).

-- 1) Case-insensitive sponsor downline tree
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
      ARRAY[lower(p.username)]::text[] AS path
    FROM public.profiles p
    WHERE lower(coalesce(p.sponsor_username, '')) = (
      SELECT lower(coalesce(s.username, ''))
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
      t.path || lower(c.username)
    FROM public.profiles c
    JOIN tree t ON lower(coalesce(c.sponsor_username, '')) = lower(coalesce(t.username, ''))
    WHERE NOT (lower(c.username) = ANY(t.path))
  )
  SELECT user_id, username, sponsor_username, depth
  FROM tree;
$$;

-- 2) Gate weekly/monthly report RPCs by access rules
CREATE OR REPLACE FUNCTION public.get_or_generate_weekly_report(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  week_start_date date,
  week_end_date date,
  total_pages_read integer,
  total_gigs_created integer,
  total_accounts_created integer,
  total_gross_income numeric,
  total_net_income numeric,
  total_contacts integer,
  total_follow_ups integer,
  submission_count integer,
  consistency_score numeric,
  wins text,
  challenges text,
  lessons_learned text,
  goals_next_week text,
  trainer_feedback text,
  trainer_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_week_start_date date;
  v_report_id uuid;
BEGIN
  -- Access control: self, admins, sponsor-downline, pro-same-group
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_week_start_date := v_today - (extract(isodow from v_today)::int - 1);
  v_report_id := public.generate_weekly_report(p_user_id, v_week_start_date);

  RETURN QUERY
  SELECT
    wr.id,
    wr.user_id,
    wr.week_start_date,
    wr.week_end_date,
    wr.total_pages_read,
    wr.total_gigs_created,
    wr.total_accounts_created,
    wr.total_gross_income,
    wr.total_net_income,
    wr.total_contacts,
    wr.total_follow_ups,
    wr.submission_count,
    wr.consistency_score,
    wr.wins,
    wr.challenges,
    wr.lessons_learned,
    wr.goals_next_week,
    wr.trainer_feedback,
    wr.trainer_id,
    wr.created_at,
    wr.updated_at
  FROM public.weekly_reports wr
  WHERE wr.id = v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_generate_monthly_goal(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  month_year date,
  target_pages integer,
  target_gigs integer,
  target_accounts integer,
  target_income numeric,
  target_contacts integer,
  actual_pages integer,
  actual_gigs integer,
  actual_accounts integer,
  actual_income numeric,
  actual_contacts integer,
  consistency_score numeric,
  skill_progress_notes text,
  income_summary text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_month_start date;
  v_goal_id uuid;
BEGIN
  -- Access control: self, admins, sponsor-downline, pro-same-group
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_goal_id := public.calculate_monthly_actuals(p_user_id, v_month_start);

  RETURN QUERY
  SELECT
    mg.id,
    mg.user_id,
    mg.month_year,
    mg.target_pages,
    mg.target_gigs,
    mg.target_accounts,
    mg.target_income,
    mg.target_contacts,
    mg.actual_pages,
    mg.actual_gigs,
    mg.actual_accounts,
    mg.actual_income,
    mg.actual_contacts,
    mg.consistency_score,
    mg.skill_progress_notes,
    mg.income_summary,
    mg.created_at,
    mg.updated_at
  FROM public.monthly_goals mg
  WHERE mg.id = v_goal_id;
END;
$$;

