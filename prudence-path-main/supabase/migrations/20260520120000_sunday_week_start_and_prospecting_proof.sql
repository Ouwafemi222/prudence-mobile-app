-- Sunday–Saturday week (Nigeria) + prospecting proof images

CREATE OR REPLACE FUNCTION public.nigeria_week_start(p_date date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_date - extract(dow from p_date)::int;
$$;

ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS prospecting_proof_images text[] DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.refresh_weekly_report_for_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
BEGIN
  v_week_start := public.nigeria_week_start(
    COALESCE(NEW.activity_date, OLD.activity_date)::date
  );
  PERFORM public.generate_weekly_report(COALESCE(NEW.user_id, OLD.user_id), v_week_start);
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'refresh_weekly_report_for_activity: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
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
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_week_start_date := public.nigeria_week_start(v_today);
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
