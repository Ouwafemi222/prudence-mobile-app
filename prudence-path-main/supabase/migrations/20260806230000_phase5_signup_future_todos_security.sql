-- Phase 5: require office on signup
-- Daily todo: allow planning for future dates (past remains read-only)
-- Security: lock down internal SECURITY DEFINER helpers

-- ---------------------------------------------------------------------------
-- Daily todo: today + future editable; past read-only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_todo_date_editable(p_todo_date date)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_todo_date < (timezone('Africa/Lagos', now()))::date THEN false
    WHEN p_todo_date > (timezone('Africa/Lagos', now()))::date THEN true
    ELSE NOT public.is_submission_locked(p_todo_date)
  END;
$$;

COMMENT ON FUNCTION public.is_todo_date_editable(date) IS
  'True for future dates, or today before 11:59 PM WAT. Past dates are read-only.';

-- ---------------------------------------------------------------------------
-- Phase 5: signup must include a valid office slug (no orphan → prudence)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text, p_office_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_username text := lower(trim(p_username));
  v_office_id uuid := p_office_id;
BEGIN
  IF v_username IS NULL OR length(v_username) < 3 THEN
    RETURN false;
  END IF;

  IF v_office_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.offices o
    WHERE o.id = v_office_id AND o.status = 'active'
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.office_id = v_office_id AND lower(p.username) = v_username
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(COALESCE(u.raw_user_meta_data->>'username', '')) = v_username
      AND u.email_confirmed_at IS NULL
      AND public.get_office_id_by_slug(u.raw_user_meta_data->>'office_slug') = v_office_id
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_sponsor_in_office(
  p_sponsor_username text,
  p_office_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.office_id = p_office_id
      AND lower(p.username) = lower(trim(p_sponsor_username))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_sponsor_in_office(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
  v_office_slug text;
  v_role public.app_role := 'member';
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_office_slug := NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'office_slug', ''))), '');
  IF v_office_slug IS NULL THEN
    RAISE EXCEPTION 'Office invite required. Sign up using your office link (?office=slug).';
  END IF;

  v_office_id := public.get_office_id_by_slug(v_office_slug);
  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Unknown office. Check your invite link or contact your office admin.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.offices o
    WHERE o.id = v_office_id
      AND lower(trim(COALESCE(o.settings->>'pending_admin_email', ''))) = lower(trim(NEW.email))
  ) THEN
    v_role := 'office_admin';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, username, sponsor_username, email, office_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    lower(COALESCE(NEW.raw_user_meta_data->>'username', '')),
    NULLIF(lower(COALESCE(NEW.raw_user_meta_data->>'sponsor_username', '')), ''),
    NEW.email,
    v_office_id
  );

  INSERT INTO public.user_roles (user_id, role, office_id)
  VALUES (NEW.id, v_role, v_office_id);

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Security: internal helpers — auth guard + revoke direct client execute
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.clone_office_content(uuid, uuid) FROM PUBLIC, anon, authenticated;

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
  IF auth.uid() IS NOT NULL THEN
    IF NOT (
      auth.uid() = p_user_id
      OR public.admin_can_access_user(auth.uid(), p_user_id)
      OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
      OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
    ) THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.generate_weekly_report(uuid, date) FROM PUBLIC, anon, authenticated;

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
  IF auth.uid() IS NOT NULL THEN
    IF NOT (
      auth.uid() = p_user_id
      OR public.admin_can_access_user(auth.uid(), p_user_id)
      OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
      OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
    ) THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.calculate_monthly_actuals(uuid, date) FROM PUBLIC, anon, authenticated;
