-- Monthly goal fields, daily new_things_learned, weekly/monthly rollups

ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS new_things_learned text DEFAULT NULL;

ALTER TABLE public.weekly_reports
  ADD COLUMN IF NOT EXISTS total_tags integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_expected_conversions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS things_learned_summary text DEFAULT NULL;

ALTER TABLE public.monthly_goals
  ADD COLUMN IF NOT EXISTS goal_book_image text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_tags integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_conversions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS things_to_learn text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_tags integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_conversions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_things_learned text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS goals_submitted_at timestamptz DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.user_is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_weekly_report(p_user_id uuid, p_week_start_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_end_date date;
  v_report_id uuid;
  v_total_pages_read integer := 0;
  v_total_gigs_created integer := 0;
  v_total_accounts_created integer := 0;
  v_total_gross_income numeric := 0;
  v_total_net_income numeric := 0;
  v_total_contacts integer := 0;
  v_total_follow_ups integer := 0;
  v_total_tags integer := 0;
  v_total_expected_conversions integer := 0;
  v_submission_count integer := 0;
  v_consistency_score numeric := 0;
  v_things_learned_summary text := '';
BEGIN
  v_week_end_date := p_week_start_date + 6;

  SELECT
    COALESCE(SUM(pages_read), 0),
    COALESCE(SUM(gigs_created), 0),
    COALESCE(SUM(accounts_created), 0),
    COALESCE(SUM(gross_income), 0),
    COALESCE(SUM(net_income), 0),
    COALESCE(SUM(daily_contacts), 0),
    COALESCE(SUM(follow_ups), 0),
    COALESCE(SUM(expected_conversions), 0),
    COALESCE(SUM(
      CASE
        WHEN submission_tags IS NULL THEN 0
        ELSE COALESCE(array_length(submission_tags, 1), 0)
      END
    ), 0),
    COUNT(*) FILTER (WHERE submitted_at IS NOT NULL),
    NULLIF(
      trim(
        string_agg(
          NULLIF(trim(new_things_learned), ''),
          E'\n\n'
          ORDER BY activity_date
        )
      ),
      ''
    )
  INTO
    v_total_pages_read,
    v_total_gigs_created,
    v_total_accounts_created,
    v_total_gross_income,
    v_total_net_income,
    v_total_contacts,
    v_total_follow_ups,
    v_total_expected_conversions,
    v_total_tags,
    v_submission_count,
    v_things_learned_summary
  FROM public.daily_activities
  WHERE user_id = p_user_id
    AND activity_date >= p_week_start_date
    AND activity_date <= v_week_end_date;

  v_consistency_score := ROUND((v_submission_count::numeric / 7::numeric) * 100, 2);

  SELECT id INTO v_report_id
  FROM public.weekly_reports
  WHERE user_id = p_user_id AND week_start_date = p_week_start_date;

  IF v_report_id IS NULL THEN
    INSERT INTO public.weekly_reports (
      user_id, week_start_date, week_end_date,
      total_pages_read, total_gigs_created, total_accounts_created,
      total_gross_income, total_net_income, total_contacts, total_follow_ups,
      total_tags, total_expected_conversions, things_learned_summary,
      submission_count, consistency_score
    ) VALUES (
      p_user_id, p_week_start_date, v_week_end_date,
      v_total_pages_read, v_total_gigs_created, v_total_accounts_created,
      v_total_gross_income, v_total_net_income, v_total_contacts, v_total_follow_ups,
      v_total_tags, v_total_expected_conversions, v_things_learned_summary,
      v_submission_count, v_consistency_score
    )
    RETURNING id INTO v_report_id;
  ELSE
    UPDATE public.weekly_reports SET
      week_end_date = v_week_end_date,
      total_pages_read = v_total_pages_read,
      total_gigs_created = v_total_gigs_created,
      total_accounts_created = v_total_accounts_created,
      total_gross_income = v_total_gross_income,
      total_net_income = v_total_net_income,
      total_contacts = v_total_contacts,
      total_follow_ups = v_total_follow_ups,
      total_tags = v_total_tags,
      total_expected_conversions = v_total_expected_conversions,
      things_learned_summary = v_things_learned_summary,
      submission_count = v_submission_count,
      consistency_score = v_consistency_score,
      updated_at = now()
    WHERE id = v_report_id;
  END IF;

  PERFORM public.calculate_monthly_actuals(p_user_id, date_trunc('month', p_week_start_date)::date);

  RETURN v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_monthly_actuals(p_user_id uuid, p_month_year date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date;
  v_month_end date;
  v_goal_id uuid;
  v_actual_pages integer := 0;
  v_actual_gigs integer := 0;
  v_actual_accounts integer := 0;
  v_actual_income numeric := 0;
  v_actual_contacts integer := 0;
  v_actual_tags integer := 0;
  v_actual_conversions integer := 0;
  v_actual_things_learned text := '';
  v_consistency_score numeric := 0;
  v_days_in_month integer;
  v_days_submitted integer := 0;
BEGIN
  v_month_start := date_trunc('month', p_month_year)::date;
  v_month_end := (date_trunc('month', p_month_year) + interval '1 month - 1 day')::date;
  v_days_in_month := extract(day FROM v_month_end)::integer;

  SELECT
    COALESCE(SUM(pages_read), 0),
    COALESCE(SUM(gigs_created), 0),
    COALESCE(SUM(accounts_created), 0),
    COALESCE(SUM(net_income), 0),
    COALESCE(SUM(daily_contacts), 0),
    COALESCE(SUM(expected_conversions), 0),
    COALESCE(SUM(
      CASE
        WHEN submission_tags IS NULL THEN 0
        ELSE COALESCE(array_length(submission_tags, 1), 0)
      END
    ), 0),
    COUNT(DISTINCT activity_date) FILTER (WHERE submitted_at IS NOT NULL),
    NULLIF(
      trim(
        string_agg(
          NULLIF(trim(new_things_learned), ''),
          E'\n\n'
          ORDER BY activity_date
        )
      ),
      ''
    )
  INTO
    v_actual_pages,
    v_actual_gigs,
    v_actual_accounts,
    v_actual_income,
    v_actual_contacts,
    v_actual_conversions,
    v_actual_tags,
    v_days_submitted,
    v_actual_things_learned
  FROM public.daily_activities
  WHERE user_id = p_user_id
    AND activity_date >= v_month_start
    AND activity_date <= v_month_end;

  v_consistency_score := ROUND((v_days_submitted::numeric / v_days_in_month::numeric) * 100, 2);

  SELECT id INTO v_goal_id
  FROM public.monthly_goals
  WHERE user_id = p_user_id AND month_year = v_month_start;

  IF v_goal_id IS NULL THEN
    INSERT INTO public.monthly_goals (
      user_id, month_year,
      actual_pages, actual_gigs, actual_accounts, actual_income, actual_contacts,
      actual_tags, actual_conversions, actual_things_learned, consistency_score
    ) VALUES (
      p_user_id, v_month_start,
      v_actual_pages, v_actual_gigs, v_actual_accounts, v_actual_income, v_actual_contacts,
      v_actual_tags, v_actual_conversions, v_actual_things_learned, v_consistency_score
    )
    RETURNING id INTO v_goal_id;
  ELSE
    UPDATE public.monthly_goals SET
      actual_pages = v_actual_pages,
      actual_gigs = v_actual_gigs,
      actual_accounts = v_actual_accounts,
      actual_income = v_actual_income,
      actual_contacts = v_actual_contacts,
      actual_tags = v_actual_tags,
      actual_conversions = v_actual_conversions,
      actual_things_learned = v_actual_things_learned,
      consistency_score = v_consistency_score,
      updated_at = now()
    WHERE id = v_goal_id;
  END IF;

  RETURN v_goal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_weekly_report_for_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
  v_was_rejected boolean;
BEGIN
  v_week_start := public.nigeria_week_start(COALESCE(NEW.activity_date, OLD.activity_date)::date);

  IF TG_OP = 'UPDATE' AND NEW.submitted_at IS NOT NULL THEN
    v_was_rejected := (OLD.verified_at IS NOT NULL AND COALESCE(OLD.is_verified, false) = false);
    IF v_was_rejected THEN
      NEW.is_verified := false;
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
      NEW.verification_feedback := NULL;
    END IF;
  END IF;

  PERFORM public.generate_weekly_report(COALESCE(NEW.user_id, OLD.user_id), v_week_start);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'refresh_weekly_report_for_activity: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_weekly_report_on_activity ON public.daily_activities;
CREATE TRIGGER trg_refresh_weekly_report_on_activity
  BEFORE INSERT OR UPDATE ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_weekly_report_for_activity();
