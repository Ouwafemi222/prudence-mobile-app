-- Return full monthly_goals row from get_or_generate_monthly_goal (tags, book image, conversions, etc.)

DROP FUNCTION IF EXISTS public.get_or_generate_monthly_goal(uuid);

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
  target_tags integer,
  target_conversions integer,
  things_to_learn text,
  goal_book_image text,
  goals_submitted_at timestamptz,
  actual_pages integer,
  actual_gigs integer,
  actual_accounts integer,
  actual_income numeric,
  actual_contacts integer,
  actual_tags integer,
  actual_conversions integer,
  actual_things_learned text,
  consistency_score numeric,
  skill_progress_notes text,
  income_summary text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_month_start date;
  v_goal_id uuid;
BEGIN
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
    mg.target_tags,
    mg.target_conversions,
    mg.things_to_learn,
    mg.goal_book_image,
    mg.goals_submitted_at,
    mg.actual_pages,
    mg.actual_gigs,
    mg.actual_accounts,
    mg.actual_income,
    mg.actual_contacts,
    mg.actual_tags,
    mg.actual_conversions,
    mg.actual_things_learned,
    mg.consistency_score,
    mg.skill_progress_notes,
    mg.income_summary,
    mg.created_at,
    mg.updated_at
  FROM public.monthly_goals mg
  WHERE mg.id = v_goal_id;
END;
$$;

-- Sponsor / member: fetch weekly report for any week (not only current)
CREATE OR REPLACE FUNCTION public.get_or_generate_weekly_report_for_week(
  p_user_id uuid,
  p_week_start_date date
)
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
  total_tags integer,
  total_expected_conversions integer,
  things_learned_summary text,
  submission_count integer,
  consistency_score numeric,
  wins text,
  challenges text,
  lessons_learned text,
  goals_next_week text,
  trainer_feedback text,
  trainer_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
BEGIN
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_report_id := public.generate_weekly_report(p_user_id, p_week_start_date);

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
    wr.total_tags,
    wr.total_expected_conversions,
    wr.things_learned_summary,
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
