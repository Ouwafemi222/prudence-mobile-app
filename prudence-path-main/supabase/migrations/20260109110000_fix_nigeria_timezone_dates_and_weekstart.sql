-- Ensure all "today/week/month" calculations align with Nigeria time (Africa/Lagos)
-- and fix weekly start logic to Monday (ISO week).

CREATE OR REPLACE FUNCTION public.is_submission_locked(p_activity_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_lock_time timestamptz;
BEGIN
  -- Lock time is 10 PM Nigeria time (WAT) on the activity date
  v_lock_time := (p_activity_date::timestamp + time '22:00') AT TIME ZONE 'Africa/Lagos';
  RETURN now() >= v_lock_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_today_submission_locked()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN public.is_submission_locked((timezone('Africa/Lagos', now()))::date);
END;
$$;

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
  -- Nigeria "today" (Africa/Lagos)
  v_today := (timezone('Africa/Lagos', now()))::date;

  -- Monday-start week (ISO): isodow Mon=1..Sun=7
  v_week_start_date := v_today - (extract(isodow from v_today)::int - 1);

  -- Generate or update the weekly report
  v_report_id := public.generate_weekly_report(p_user_id, v_week_start_date);

  -- Return the report
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
  -- Nigeria "today" (Africa/Lagos)
  v_today := (timezone('Africa/Lagos', now()))::date;

  -- First day of current month (Nigeria time)
  v_month_start := date_trunc('month', v_today)::date;

  -- Calculate or update the monthly actuals
  v_goal_id := public.calculate_monthly_actuals(p_user_id, v_month_start);

  -- Return the monthly goal
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


